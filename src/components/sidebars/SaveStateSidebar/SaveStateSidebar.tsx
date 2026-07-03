import { type RefObject } from 'react';

import { type GizmoModule } from '../../../gizmo/types';

import { ChevronLeft, ChevronRight } from "lucide-react";

// Styling
import '../../../styles/sidebar.css';

type GizmoSaveStateSidebarProps = 
{
    module: GizmoModule;

    emu_ref: RefObject<number>;
    emu: number;
    set_emu: React.Dispatch<React.SetStateAction<number>>;

    canvas_ref: RefObject<HTMLCanvasElement | null>;

    collapsed: boolean;
    set_collapsed: React.Dispatch<React.SetStateAction<boolean>>;

    save_states: SaveStateSlot[];
    set_save_states: React.Dispatch<React.SetStateAction<SaveStateSlot[]>>;

    selected_save_state: SaveStateSlot | null;
    set_selected_save_state: React.Dispatch<React.SetStateAction<SaveStateSlot | null>>;

    start_drawing: (emu: number) => void;
}

export type SaveStateSlot =
{
    // Meta Data
    created_at:     string;
    id:             string;
    name:           string;
    screenshot_url: string;
    
    // Emulation
    emu: number; 
}

export function GizmoSaveStateSidebar(props: GizmoSaveStateSidebarProps): React.JSX.Element
{
    function create_save_state()
    {
        const canvas = props.canvas_ref.current;
        const module = props.module;
        const emu    = props.emu_ref.current;

        if (!canvas || !(module) || (emu === 0))
            return;

        const screenshot_url = canvas.toDataURL("image/png");
    
        const slot: SaveStateSlot =
        {
            // Meta Data
            created_at: new Date().toLocaleDateString(),
            id: crypto.randomUUID(),
            name: `State ${Date.now()}`,
            screenshot_url: screenshot_url,
            
            // Emulation
            emu: module._create_gizmo_save_state(emu),
        }

        const fresh_save_states = [slot, ... props.save_states];
        props.set_save_states(fresh_save_states);
    }

    function destroy_selected_save_state()
    {
        if (!props.selected_save_state)
            return;

        const module = props.module;
        const emu    = props.selected_save_state.emu;

        if (!module || (emu === 0))
            return;

        module._destroy_gizmo_emulator(emu);

        props.set_save_states(props.save_states.filter((state) => { return (state.emu !== emu)}));
        props.set_selected_save_state(null);
    }

    function load_selected_save_state()
    {
        if (!props.selected_save_state)
            return;

        const module = props.module;
        const    emu = props.emu_ref.current;

        if (!module || (emu === 0))
            return;

        const fresh_emu = module._create_gizmo_save_state(props.selected_save_state.emu);
        module._destroy_gizmo_emulator(emu);
        
        props.emu_ref.current = fresh_emu;
        props.set_selected_save_state(null);
        props.set_emu(fresh_emu);
    }

    return (
        <>
        { (!props.collapsed) &&
            <div className="flex flex-col">
                <button
                    onClick={() => 
                    { 
                        props.set_collapsed(true);
                    }} 
                    className="block btn-collapse-open btn-primary
                ">
                    <ChevronLeft className="mx-auto" size={30}/>
                </button>
                <div className="
                    gizmo-sidebar
                    flex flex-col flex-1 gap-5
                ">
                    <div>
                        <button
                            onClick={() => { create_save_state(); }}
                            disabled={(props.emu_ref.current === 0)} 
                            className="btn-primary btn-rounded mt-4"
                        >
                            Save State
                        </button>
                        <button
                            onClick={() => { load_selected_save_state(); }}
                            disabled={((props.emu_ref.current === 0) || (props.selected_save_state === null))}
                            className="btn-primary btn-rounded mt-4"
                        >
                            Load
                        </button>
                        <button
                            onClick={() => { destroy_selected_save_state(); }}
                            disabled={((props.emu_ref.current === 0) || (props.selected_save_state === null))} 
                            className="btn-danger btn-rounded mt-4"
                        >
                            Erase
                        </button>
                    </div>
                    <div className="
                        flex-1 
                        overflow-y-scroll scrollbar scrollbar-left
                    ">
                        { 
                            props.save_states.map((slot) => 
                            (   
                                <div
                                    key={slot.id}
                                    className=
                                    {`
                                        border-2
                                        mx-auto
                                        w-fit h-fit
                                        ${    
                                            (slot.emu === props.selected_save_state?.emu)
                                            ? "my-8 border-(--color-primary) glow scale-110"
                                            : "my-4  border-(--color-text)"
                                        }
                                    `}
                                >
                                    <button
                                        onClick={() =>
                                        {
                                            if (slot.emu === props.selected_save_state?.emu)
                                            {
                                                props.set_selected_save_state(null);
                                                return;
                                            } 

                                            props.set_selected_save_state(slot);
                                        }}
                                        className="block"
                                    >
                                        <img src={slot.screenshot_url} className="block"/>
                                    </button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        }
        { (props.collapsed) &&
            <div>
                <button
                    onClick={() => 
                    {
                        props.set_collapsed(false);
                    }} 
                    className="btn-collapse-closed btn-primary">
                    <ChevronRight className="mx-auto" size={30} />
                </button>
            </div>
        }
        </>
    );
}