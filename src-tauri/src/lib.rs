use base64::Engine;
use notify::{RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

/// Holds the folder the user opened. All file commands are restricted to it.
struct AppState {
    base_dir: Mutex<Option<PathBuf>>,
    watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

#[derive(Serialize)]
struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
}

#[derive(Clone, Serialize)]
struct FsChangeEvent {
    paths: Vec<String>,
    kind: String,
}

fn canonical(path: &str) -> Result<PathBuf, String> {
    Path::new(path)
        .canonicalize()
        .map_err(|e| format!("{}: {}", path, e))
}

/// Reject paths outside the opened folder (after symlink resolution).
fn scope_check(base: Option<&PathBuf>, path: &Path) -> Result<(), String> {
    match base {
        Some(base) if path.starts_with(base) => Ok(()),
        Some(_) => Err("path is outside the opened folder".into()),
        None => Err("no folder opened".into()),
    }
}

fn check_scope(state: &State<AppState>, path: &Path) -> Result<(), String> {
    let base = state.base_dir.lock().unwrap();
    scope_check(base.as_ref(), path)
}

/// Like scope_check, but for paths that may not exist yet (checks the parent).
fn scope_check_for_write(base: Option<&PathBuf>, path: &Path) -> Result<PathBuf, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "invalid path".to_string())?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let file_name = path.file_name().ok_or_else(|| "invalid path".to_string())?;
    let resolved = parent.join(file_name);
    scope_check(base, &resolved)?;
    Ok(resolved)
}

fn check_scope_for_write(state: &State<AppState>, path: &Path) -> Result<PathBuf, String> {
    let base = state.base_dir.lock().unwrap();
    scope_check_for_write(base.as_ref(), path)
}

fn build_tree(dir: &Path) -> Vec<FileNode> {
    let mut nodes: Vec<FileNode> = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return nodes;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        if path.is_dir() {
            if ["node_modules", "target", "dist"].contains(&name.as_str()) {
                continue;
            }
            let children = build_tree(&path);
            // Keep only directories that contain markdown somewhere below
            if !children.is_empty() {
                nodes.push(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: true,
                    children: Some(children),
                });
            }
        } else if path
            .extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("md") || e.eq_ignore_ascii_case("markdown"))
        {
            nodes.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                children: None,
            });
        }
    }
    nodes.sort_by(|a, b| (b.is_dir, a.name.to_lowercase()).cmp(&(a.is_dir, b.name.to_lowercase())));
    nodes
}

#[tauri::command]
fn open_folder(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: String,
) -> Result<Vec<FileNode>, String> {
    let dir = canonical(&path)?;
    if !dir.is_dir() {
        return Err("not a directory".into());
    }
    *state.base_dir.lock().unwrap() = Some(dir.clone());

    // Watch the folder; the frontend decides whether to reload or warn.
    let app_handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            let kind = match event.kind {
                notify::EventKind::Create(_) => "create",
                notify::EventKind::Modify(_) => "modify",
                notify::EventKind::Remove(_) => "remove",
                _ => return,
            };
            let paths: Vec<String> = event
                .paths
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            let _ = app_handle.emit(
                "fs-change",
                FsChangeEvent {
                    paths,
                    kind: kind.into(),
                },
            );
        }
    })
    .map_err(|e| e.to_string())?;
    watcher
        .watch(&dir, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    *state.watcher.lock().unwrap() = Some(watcher);

    Ok(build_tree(&dir))
}

#[tauri::command]
fn list_tree(state: State<AppState>) -> Result<Vec<FileNode>, String> {
    let base = state.base_dir.lock().unwrap();
    let base = base.as_ref().ok_or("no folder opened")?;
    Ok(build_tree(base))
}

#[tauri::command]
fn read_text_file(state: State<AppState>, path: String) -> Result<String, String> {
    let path = canonical(&path)?;
    check_scope(&state, &path)?;
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(state: State<AppState>, path: String, content: String) -> Result<(), String> {
    let path = check_scope_for_write(&state, Path::new(&path))?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(state: State<AppState>, path: String) -> Result<(), String> {
    let path = check_scope_for_write(&state, Path::new(&path))?;
    if path.exists() {
        return Err("file already exists".into());
    }
    std::fs::write(&path, "").map_err(|e| e.to_string())
}

/// Save a pasted image (base64) under the document folder; returns the absolute path.
#[tauri::command]
fn save_image(state: State<AppState>, dir: String, name: String, base64_data: String) -> Result<String, String> {
    let dir_path = canonical(&dir)?;
    check_scope(&state, &dir_path)?;
    let assets = dir_path.join("assets");
    std::fs::create_dir_all(&assets).map_err(|e| e.to_string())?;
    validate_image_name(&name)?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;
    let target = assets.join(&name);
    std::fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

fn validate_image_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("invalid file name".into());
    }
    Ok(())
}

/// Write an exported document (HTML etc.) to a user-chosen location.
/// The path always comes from the native save dialog, so it is not
/// restricted to the opened folder.
#[tauri::command]
fn export_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            base_dir: Mutex::new(None),
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            open_folder,
            list_tree,
            read_text_file,
            write_text_file,
            create_file,
            save_image,
            export_file
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Sumidown (dev)");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmpdir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("mdeditor-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir.canonicalize().unwrap()
    }

    #[test]
    fn scope_rejects_outside_paths() {
        let base = tmpdir("scope");
        let other = tmpdir("scope-other");
        assert!(scope_check(Some(&base), &base.join("a.md")).is_ok());
        assert!(scope_check(Some(&base), &other.join("a.md")).is_err());
        assert!(scope_check(None, &base.join("a.md")).is_err());
    }

    #[test]
    fn scope_for_write_resolves_dot_dot_traversal() {
        let base = tmpdir("traverse");
        std::fs::create_dir_all(base.join("sub")).unwrap();
        // inside, via subdir
        assert!(scope_check_for_write(Some(&base), &base.join("sub/new.md")).is_ok());
        // escape attempt: base/sub/../../evil.md resolves outside base's sub but inside base? No:
        // parent canonicalization turns base/sub/../.. into base's parent.
        let evil = base.join("sub/../../evil.md");
        assert!(scope_check_for_write(Some(&base), &evil).is_err());
    }

    #[test]
    fn scope_rejects_symlink_escape() {
        let base = tmpdir("symlink");
        let outside = tmpdir("symlink-outside");
        std::fs::write(outside.join("secret.md"), "x").unwrap();
        std::os::unix::fs::symlink(&outside, base.join("link")).unwrap();
        // canonical() resolves the symlink target, which falls outside base
        let resolved = canonical(base.join("link/secret.md").to_str().unwrap()).unwrap();
        assert!(scope_check(Some(&base), &resolved).is_err());
    }

    #[test]
    fn build_tree_lists_only_markdown_and_skips_hidden() {
        let base = tmpdir("tree");
        std::fs::write(base.join("b.md"), "").unwrap();
        std::fs::write(base.join("a.markdown"), "").unwrap();
        std::fs::write(base.join("note.txt"), "").unwrap();
        std::fs::write(base.join(".hidden.md"), "").unwrap();
        std::fs::create_dir_all(base.join("docs")).unwrap();
        std::fs::write(base.join("docs/c.md"), "").unwrap();
        std::fs::create_dir_all(base.join("empty-dir")).unwrap();
        std::fs::create_dir_all(base.join("node_modules/pkg")).unwrap();
        std::fs::write(base.join("node_modules/pkg/readme.md"), "").unwrap();

        let tree = build_tree(&base);
        let names: Vec<&str> = tree.iter().map(|n| n.name.as_str()).collect();
        // dirs first, then files alphabetically; txt/hidden/empty/node_modules excluded
        assert_eq!(names, vec!["docs", "a.markdown", "b.md"]);
        let docs = &tree[0];
        assert!(docs.is_dir);
        assert_eq!(docs.children.as_ref().unwrap()[0].name, "c.md");
    }

    #[test]
    fn image_name_validation() {
        assert!(validate_image_name("img-123.png").is_ok());
        assert!(validate_image_name("../evil.png").is_err());
        assert!(validate_image_name("a/b.png").is_err());
        assert!(validate_image_name("a\\b.png").is_err());
        assert!(validate_image_name("").is_err());
    }
}
