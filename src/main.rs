// Sprite Tracker: tracks your Fortnite Sprite collection. All the work happens in ui/; Rust only reads Muck95's theme.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Muck95's settings.json (dark mode, accent colour), or "" when Muck95 isn't installed.
#[tauri::command]
fn muck95_settings() -> String {
    std::env::var("APPDATA")
        .ok()
        .and_then(|d| std::fs::read_to_string(format!("{d}\Muck95\settings.json")).ok())
        .unwrap_or_default()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![muck95_settings])
        .run(tauri::generate_context!())
        .expect("Sprite Tracker failed to start");
}
