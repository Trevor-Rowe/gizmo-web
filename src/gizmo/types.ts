export const JoypadButton = 
{
  A      : 1,
  B      : 2,
  START  : 3,
  SELECT : 4,
  UP     : 5,
  DOWN   : 6,
  LEFT   : 7,
  RIGHT  : 8

} as const;

export const key_to_button: Record<string, number> =
{
    KeyX: JoypadButton.A,
    KeyZ: JoypadButton.B,

    Enter:     JoypadButton.START,
    Backspace: JoypadButton.SELECT,

    ArrowRight: JoypadButton.RIGHT,
    ArrowLeft:  JoypadButton.LEFT,
    ArrowUp:    JoypadButton.UP,
    ArrowDown:  JoypadButton.DOWN
}

export interface GizmoModule 
{
    // C-Standard Heap

    HEAPU8: Uint8Array;

    _malloc(size: number): number;

    _free(ptr: number): void;

    // Audio

    _sample_gizmo_audio(): number;
    
    // BIOS

    _execute_gizmo_bios(emu_ptr: number): void;

    // Cart

    _advance_gizmo_rtc_day(emu_ptr: number): void;

    _advance_gizmo_rtc_hour(emu_ptr: number): void;

    _advance_gizmo_rtc_minute(emu_ptr: number): void;

    _advance_gizmo_rtc_second(emu_ptr: number): void;

    _copy_gizmo_cartridge_ram(ram_ptr: number): number;

    _destroy_gizmo_cartridge_ram(ram_ptr: number): void;

    _create_gizmo_cartridge_save(emu_ptr: number): number;

    _destroy_gizmo_cartridge_save(save_ptr: number): void;

    _load_gizmo_cartridge_save(emu_ptr: number, bytes: number, size: number): boolean;

    // Clock

    _run_gizmo_frame(emu_ptr: number, turbo: boolean): void;

    // Emulator 

    _setup_gizmo(): boolean;
    
    _clean_gizmo(): void;

    _load_gizmo_rom_context(rom_ptr: number, size: number): boolean;

    _create_gizmo_emulator(): number;
    
    _destroy_gizmo_emulator(emu_ptr: number): void;

    _create_gizmo_save_state(emu_ptr: number): number;

    // Joypad

    _request_gizmo_joypad_interrupt(emu_ptr: number): void;

    _press_gizmo_joypad(emu_ptr: number, code: number, pressed: boolean): void;
    
    // Video

    _get_gizmo_frame(emu_ptr: number): number;

    // Wrapper Utility

    _gizmo_save_size(save_ptr: number): number;

    _gizmo_save_bytes(save_ptr: number): number;

    _gizmo_cart_ram_size(ram_ptr: number): number;

    _gizmo_cart_ram_bytes(ram_ptr: number): number;
}