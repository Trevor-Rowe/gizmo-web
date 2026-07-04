import { useEffect, useRef } from 'react';

// Gizmo
import { copy_bytes_in_wasm } from '../../gizmo/gizmo';
import { key_to_button, type GizmoModule } from '../../gizmo/types';

// Sidebars
import { DEFAULT_SPEED, GizmoControlSidebar } from '../../components/sidebars/ControlSidebar/ControlSidebar';
import { GizmoSaveStateSidebar, type SaveStateSlot } from '../../components/sidebars/SaveStateSidebar/SaveStateSidebar'

// Styling
import './GizmoGameBoy.css'
import { useLocation, useNavigate } from 'react-router-dom';

// Display
const FRAME_WIDTH:  number = 160;
const FRAME_HEIGHT: number = 144;
const FRAME_SIZE:   number = FRAME_WIDTH * FRAME_HEIGHT * 4;

// Animation Timing
const FRAME_TIME_MS:        number = (1000 / 60);
const FRAME_TIME_BUDGET_MS: number = 10;

type RomRouteState =
{
    rom_name: string;
    rom_path: string;
}

type GizmoProps =
{
    module: GizmoModule;

    emu_ref: React.RefObject<number>;
    emu: number;
    set_emu: React.Dispatch<React.SetStateAction<number>>;

    muted: boolean;
    set_muted: React.Dispatch<React.SetStateAction<boolean>>;

    collapsed: boolean;
    set_collapsed: React.Dispatch<React.SetStateAction<boolean>>;
    
    save_states: SaveStateSlot[];
    set_save_states: React.Dispatch<React.SetStateAction<SaveStateSlot[]>>;

    selected_save_state: SaveStateSlot | null;
    set_selected_save_state: React.Dispatch<React.SetStateAction<SaveStateSlot | null>>;

    volume_ref: React.RefObject<number>;
    turbo_ref: React.RefObject<number>;
    speed_ref: React.RefObject<number>;

    clear_audio_buffer: () => void;
    feed_audio_samples: (quantity: number) => void;
    clear_save_states: () => void;
}

function download_bytes(bytes: Uint8Array, file_name: string): void 
{
    const array_buffer = bytes.buffer.slice(bytes.byteOffset, (bytes.byteOffset + bytes.byteLength)) as ArrayBuffer;

    const blob = new Blob([array_buffer], { type: "application/octet-stream" });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file_name + ".giz";

    anchor.click();

    URL.revokeObjectURL(url);
}

export function Gizmo(props: GizmoProps): React.JSX.Element
{
    const   rtc_counter = useRef<number>(0);

    // Video
    const animation_ref = useRef<number>(0);
    const    canvas_ref = useRef<HTMLCanvasElement>(null);

    // Emulation
    const rom_name_ref = useRef<string>("");

    // Navigation from Libray
    const location = useLocation();
    const navigate = useNavigate();
    const route_state = location.state as RomRouteState | null;

    // Canvas Animation

    function start_drawing(emu: number)
    {
        cancelAnimationFrame(animation_ref.current);

        if (emu === 0)
            return;

        const module = props.module;
        const canvas = canvas_ref.current;

        if (!canvas)
            return;

        const ctx = canvas.getContext("2d");

        if (!ctx)
            return;

        const image_data = ctx.createImageData(FRAME_WIDTH, FRAME_HEIGHT);

        function draw_frame(): void 
        {
            if (!module || !ctx)
                return;

            const   frame_ptr = module._get_gizmo_frame(emu);
            const frame_bytes = module.HEAPU8.subarray(frame_ptr, (frame_ptr + FRAME_SIZE));

            for (let i = 0; i < FRAME_SIZE; i += 4)
            {
                image_data.data[i + 0] = frame_bytes[i + 2]; // R
                image_data.data[i + 1] = frame_bytes[i + 1]; // G
                image_data.data[i + 2] = frame_bytes[i + 0]; // B
                image_data.data[i + 3] = frame_bytes[i + 3]; // A
            }

            ctx.putImageData(image_data, 0, 0);
        }

        function tick_rtc_clock()
        {
            rtc_counter.current += 1;
            
            if (rtc_counter.current < 60)
                return;

            rtc_counter.current = 0;

            module._advance_gizmo_rtc_second(props.emu_ref.current);
        }
        
        // Animation Driving

        let   last_time = 0;
        let accumulator = 0;

        function loop(now: number): void
        {
            if (!module)
                return;

            const delta = Math.min((now - last_time), 100);
            last_time = now;
            accumulator += delta;

            while (accumulator > FRAME_TIME_MS)
            {
                const start = performance.now();
                let frames = 0;

                while ((performance.now() - start) < FRAME_TIME_BUDGET_MS)
                {
                    if (++frames >= props.speed_ref.current)
                        break;
                    
                    module._run_gizmo_frame(emu, true);
                }

                tick_rtc_clock();
                module._run_gizmo_frame(emu, false);
                props.feed_audio_samples(735);
                accumulator -= FRAME_TIME_MS;
            }

            draw_frame();

            animation_ref.current = window.requestAnimationFrame(loop);
        }

        animation_ref.current = window.requestAnimationFrame(loop);
    }

    function stop_drawing()
    {
        cancelAnimationFrame(animation_ref.current);
    }

    // File Handling

    function create_fresh_emulation_context(bytes: Uint8Array, module: GizmoModule, rom_name: string): void
    {
        const rom_ptr: number = copy_bytes_in_wasm(module, bytes);

        module._load_gizmo_rom_context(rom_ptr, bytes.length);
        
        rom_name_ref.current = rom_name;
    }

    async function load_rom_file(event: React.ChangeEvent<HTMLInputElement>): Promise<void>
    {
        const module = props.module;
        const file   = event.target.files?.[0];
        
        if (!module || !file)
            return;

        const bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());

        const current_emu = props.emu_ref.current;

        create_fresh_emulation_context(bytes, module, file.name);

        if (current_emu !== 0)
            module._destroy_gizmo_emulator(current_emu);

        const fresh_emu = module._create_gizmo_emulator();
        module._execute_gizmo_bios(fresh_emu);
        
        props.emu_ref.current = fresh_emu;
        props.set_emu(fresh_emu);
        props.clear_save_states();
    }

    async function upload_save_file(event: React.ChangeEvent<HTMLInputElement>): Promise<void>
    {
        const module = props.module;
        const save   = event.target.files?.[0];
        const emu    = props.emu_ref.current;

        if (!module || !save || (emu === 0))
            return;

        const bytes: Uint8Array = new Uint8Array(await save.arrayBuffer());
        const bytes_ptr: number = copy_bytes_in_wasm(module, bytes);

        const fresh_emu: number = module._create_gizmo_emulator();
        
        const loaded: boolean = module._load_gizmo_cartridge_save(fresh_emu, bytes_ptr, bytes.length);
        module._free(bytes_ptr);
        
        if (!loaded)
        {
            console.error(`Unable To Properly Load ${save.name}`)
            module._destroy_gizmo_emulator(fresh_emu);
            return;
        }
        
        module._destroy_gizmo_emulator(emu);
        module._execute_gizmo_bios(fresh_emu);
        
        props.emu_ref.current = fresh_emu;
        props.set_emu(fresh_emu);
        props.clear_save_states();
    }

    async function download_save_file()
    {
        const module = props.module;
        const emu    = props.emu_ref.current;

        if (!module || (emu === 0))
            return;

        const save_ptr: number = module._create_gizmo_cartridge_save(emu);
        const file_name: string = (rom_name_ref.current).split(".")[0];
        const file_size: number = module._gizmo_save_size(save_ptr);
        const bytes_ptr:  number = module._gizmo_save_bytes(save_ptr); 
        const bytes: Uint8Array = module.HEAPU8.subarray(bytes_ptr, (bytes_ptr + file_size));
        download_bytes(bytes, file_name);

        module._destroy_gizmo_cartridge_save(save_ptr);
    }

    // Render Effects

    useEffect((() => // Cleanup
    {
        if (props.emu_ref.current !== 0)
            start_drawing(props.emu_ref.current);

        return (() =>
        {
            stop_drawing();

        });

    }), [props.emu]);

    useEffect((() => // 3: Add Keyboard Listeners
    {
        const module = props.module;

        if (!module)
            return;

        const emu = props.emu_ref.current;

        function handle_key_down(event: KeyboardEvent): void
        {
            event.preventDefault();
            
            if (event.repeat)
                return;

            switch(event.code)
            {
                case "Space": // Turbo!
                    props.clear_audio_buffer();
                    props.speed_ref.current = props.turbo_ref.current;
                    break;
            }

            const button = key_to_button[event.code];

            if (!module || (emu === 0) || (button == undefined))
                return;

            module._press_gizmo_joypad(emu, button, true);
            module._request_gizmo_joypad_interrupt(emu);
        }

        function handle_key_release(event: KeyboardEvent): void
        {
            if (event.repeat)
                return;

            switch(event.code)
            {
                case "Space":
                    props.speed_ref.current = DEFAULT_SPEED;
                    break;
            }

            const button = key_to_button[event.code]

            if (!module || (emu === 0) || (button == undefined))
                return;

            module._press_gizmo_joypad(emu, button, false);
        }

        window.addEventListener("keydown", handle_key_down);
        window.addEventListener("keyup",   handle_key_release);

        return (() => 
        {
            window.removeEventListener("keydown", handle_key_down);
            window.removeEventListener("keyup", handle_key_release);
        });

    }), [props.emu]);

    useEffect(() => 
    {   
        async function load_rom()
        {
            const module = props.module;

            if (!module || !route_state?.rom_name || !route_state?.rom_path)
                return;
            
            const response = await fetch(route_state.rom_path);
            const bytes: Uint8Array = new Uint8Array(await response.arrayBuffer());

            if (!bytes)
                return;

            create_fresh_emulation_context(bytes, module, route_state.rom_name!);
            rom_name_ref.current = route_state.rom_name;

            props.clear_audio_buffer();
            props.clear_save_states();

            if (props.emu_ref.current !== 0)
                module._destroy_gizmo_emulator(props.emu_ref.current);

            const fresh_emu = module._create_gizmo_emulator();
            props.emu_ref.current = fresh_emu;
            props.set_emu(fresh_emu);

            module._execute_gizmo_bios(fresh_emu);
        }

        load_rom();

        navigate(".", 
        {
            replace: true,
            state: null
        });

    }, [route_state?.rom_name, route_state?.rom_path]);

    return (
        <div className="
            flex
            bg-(--color-background)
            w-full h-full
        ">

            <GizmoSaveStateSidebar
                module={props.module}
                
                canvas_ref={canvas_ref}
                
                emu_ref={props.emu_ref}
                emu={props.emu}
                set_emu={props.set_emu}

                collapsed={props.collapsed}
                set_collapsed={props.set_collapsed}

                save_states={props.save_states}
                set_save_states={props.set_save_states}

                selected_save_state={props.selected_save_state}
                set_selected_save_state={props.set_selected_save_state}

                start_drawing={start_drawing}
            />
            <div className="
                bg-(--color-surface)
                border-2 border-(--color-text)
                flex justify-center items-center
                flex-1
            ">
                {(props.emu !== 0) &&
                    <canvas
                        ref={canvas_ref}
                        width={FRAME_WIDTH}
                        height={FRAME_HEIGHT}
                    />
                }
                { (props.emu === 0) &&
                    <p className="text-5xl mx-10">
                        Load your own ROM or check the 'Demos' tab!
                    </p>
                }
            </div>
 
            <GizmoControlSidebar 
                emu_ref={props.emu_ref}

                load_rom_file={load_rom_file}
                upload_save_file={upload_save_file}
                download_save_file={download_save_file}

                muted={props.muted}
                set_muted={props.set_muted}

                collapsed={props.collapsed}
                set_collapsed={props.set_collapsed}

                volume_ref={props.volume_ref}
                speed_ref={props.speed_ref}
                turbo_ref={props.turbo_ref}
            />

        </div>
    );
}

