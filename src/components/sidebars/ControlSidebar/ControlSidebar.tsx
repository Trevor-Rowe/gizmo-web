import { useRef, useState } from 'react';

import { ChevronLeft, ChevronRight } from "lucide-react";

// Styling
import '../../../styles/sidebar.css'

export const MAX_VOLUME:     number =   100;
export const MIN_VOLUME:     number =     0;
export const DEFAULT_VOLUME: number =    20;
export const DEFAULT_MUTE:   boolean = true;

export const MAX_TURBO:      number =    40;
export const MIN_TURBO:      number =     1;
export const DEFAULT_SPEED:  number =     1;


type GizmoControlSidebarProps = 
{
    emu_ref: React.RefObject<number>;

    load_rom_file: (event: React.ChangeEvent<HTMLInputElement, Element>) => Promise<void>;
    upload_save_file: (event: React.ChangeEvent<HTMLInputElement, Element>) => Promise<void>;
    download_save_file: () => Promise<void>;

    muted: boolean;
    set_muted: React.Dispatch<React.SetStateAction<boolean>>;

    collapsed: boolean;
    set_collapsed: React.Dispatch<React.SetStateAction<boolean>>;

    volume_ref: React.RefObject<number>;
    speed_ref: React.RefObject<number>;
    turbo_ref: React.RefObject<number>;
}

export function GizmoControlSidebar(props: GizmoControlSidebarProps): React.JSX.Element
{
    const [volume, set_volume] = useState<number>(props.volume_ref.current);
    const [turbo, set_turbo] = useState<number>(props.turbo_ref.current);

    const file_ref = useRef<HTMLInputElement | null>(null);
    const save_ref = useRef<HTMLInputElement | null>(null);

    return (
        <>
        { (!props.collapsed) &&
            <aside className="flex flex-col">
                <button
                    onClick={() => 
                    {
                        props.set_collapsed(true);
                    }} 
                    className="btn-collapse-open btn-primary
                ">
                    <ChevronRight className="mx-auto" size={30} />
                </button>
                <div className="
                    gizmo-sidebar 
                    flex flex-col gap-10 items-center 
                    overflow-y-scroll h-full
                    scrollbar
                ">
                    <div>
                        <input 
                            ref={file_ref}
                            type="file"
                            accept=".gb,.gbc"
                            onChange={async (event) => await props.load_rom_file(event) }
                            className="hidden"
                        />
                        <button 
                            onClick={async () => 
                            {
                                await file_ref.current?.click();
                            }}
                            className="btn-primary btn-rounded"
                        >
                            Load ROM
                        </button> 
                    </div>
                    <div>
                        <input 
                            ref={save_ref}
                            type="file"
                            accept=".giz"
                            onChange={props.upload_save_file}
                            className="hidden"
                        />
                        <button 
                            onClick={async () => 
                            {
                                await save_ref.current?.click();
                            }}
                            disabled={(props.emu_ref.current === 0)}
                            className="btn-primary btn-rounded"
                        >
                            Upload Save
                        </button>
                    </div>
                    <div>
                        <button 
                            onClick={async () => await props.download_save_file() }
                            disabled={(props.emu_ref.current === 0)}
                            className="btn-primary btn-rounded"
                        >
                            Download Save
                        </button>
                    </div>
                    <div> {/* Audio Toggling */}
                        {  (props.muted) &&
                            <button 
                                onClick={async () => 
                                { 
                                    props.set_muted(false); 
                                }}
                                disabled={(props.emu_ref.current === 0)}
                                className="btn-primary btn-rounded"
                            >
                                Audio ON
                            </button>
                        }
                        {  (!props.muted) &&
                            <button 
                                onClick={async () => 
                                {
                                    props.set_muted(true); 
                                }}
                                disabled={(props.emu_ref.current === 0)}
                                className="btn-danger btn-rounded"
                            >
                                Audio OFF
                            </button>
                        }
                    </div>
                    <div>
                        <p className="
                            border-b-2 border-(--color-primary)
                            font-bold italic
                            m-2
                            w-fit 
                        ">
                            Volume
                        </p>
                        <div className="
                            flex justify-between items-center
                            mb-2
                        ">
                            <button 
                                onClick={() => 
                                {
                                    const temp_volume = Math.max(MIN_VOLUME, (props.volume_ref.current - 5));
                                    props.volume_ref.current = temp_volume;
                                    set_volume(temp_volume);
                                }}                               
                                className="block btn-primary btn-directional btn-rounded"
                            >  
                                -
                            </button>
                            <p className="text-3xl">
                                {volume}
                            </p>
                            <button 
                                onClick={() => 
                                {
                                    const temp_volume = Math.min(MAX_VOLUME, (props.volume_ref.current + 5));
                                    props.volume_ref.current = temp_volume;
                                    set_volume(temp_volume);
                                }}
                                className="block btn-primary btn-directional btn-rounded"
                            >
                                +
                            </button>
                        </div>
                        <input 
                            type="range"
                            min={MIN_VOLUME}
                            max={MAX_VOLUME}
                            value={props.volume_ref.current}
                            className="slider"
                            onChange={(event) => 
                            {
                                const temp_volume = Number(event.target.value);
                                props.volume_ref.current = temp_volume;
                                set_volume(temp_volume);
                            }}
                        />
                    </div>
                    <div>
                        <p className="
                            m-2
                            w-fit 
                        ">
                            <span className="border-b-2 border-(--color-primary) font-bold italic">Turbo</span>
                            <span className="italic"> (Space)</span>
                        </p>
                        <div className="
                            flex justify-between items-center
                            mb-2    
                        ">
                            <button 
                                onClick={() => 
                                {
                                    const temp_turbo = Math.max(MIN_TURBO, (props.turbo_ref.current - 1));
                                    props.turbo_ref.current = temp_turbo;
                                    set_turbo(temp_turbo);
                                }}                            
                                className="block btn-primary btn-directional btn-rounded"
                            >
                                -
                            </button>
                            <p className="text-3xl">
                                {turbo}
                            </p>
                            <button 
                                onClick={() => 
                                {
                                    const temp_turbo = Math.min(MAX_TURBO, (props.turbo_ref.current + 1));
                                    props.turbo_ref.current = temp_turbo;
                                    set_turbo(temp_turbo);
                                }}                            
                                className="block btn-primary btn-directional btn-rounded"
                            >
                                +
                            </button>
                        </div>
                        <input 
                            type="range"
                            min={MIN_TURBO}
                            max={MAX_TURBO}
                            value={props.turbo_ref.current}
                            className="slider"
                            onChange={(event) => 
                            {
                                const temp_turbo = Number(event.target.value);
                                props.turbo_ref.current = temp_turbo;
                                set_turbo(temp_turbo);
                            }}
                        />
                    </div>
                </div>
            </aside>
        }
        { (props.collapsed) &&
            <aside className="h-screen flex flex-col">
                <button
                    onClick={() => 
                    { 
                        props.set_collapsed(false);
                    }} 
                    className="btn-collapse-closed btn-primary">
                    <ChevronLeft className="mx-auto" size={30} />
                </button>
            </aside>
        }
        </>
    );
}
