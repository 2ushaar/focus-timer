#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use arboard::Clipboard;
use tauri::{Emitter, Manager, AppHandle};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState, GlobalShortcutExt};

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        
                        // FIX: Use Modifiers::CONTROL instead of CTRL
                        if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyF) {
                            println!("Shortcut 'Ctrl+Shift+F' triggered!");
                            handle_clipboard_reading(app);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Register the hotkey
            app.handle().global_shortcut().register("Ctrl+Shift+F")?;
            println!("Global shortcut registered successfully!");
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_clipboard_reading(app: &AppHandle) {
    println!("Reading clipboard...");

    let mut clipboard = match Clipboard::new() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to access clipboard: {}", e);
            return;
        }
    };

    if let Ok(text) = clipboard.get_text() {
        let clean_text = text.trim().to_string();

        if !clean_text.is_empty() {
            println!("Text detected ({} chars). Sending to frontend...", clean_text.len());

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("clipboard-text-captured", clean_text);
                let _ = window.set_focus(); 
            }
        } else {
            println!("Clipboard was empty!");
        }
    }
}