import type { GizmoModule } from "./types.js";

type GizmoFactory = (options?: 
{

    locateFile?: (path: string) => string;

}) => Promise<GizmoModule>;

declare global 
{

    interface Window {
        createGizmoModule?: GizmoFactory;
    }

}

function load_script(src: string): Promise<void> 
{

    return new Promise<void>((resolve, reject) => {
      
        if (window.createGizmoModule) 
        {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;

        script.onload  = (() => resolve());
        script.onerror = (() => reject(new Error(`Failed to load ${src}`)));

        document.body.appendChild(script);
    });

}

export async function load_gizmo(): Promise<GizmoModule> {

    await load_script("/wasm/gizmo.js");

    if (!window.createGizmoModule)
        throw new Error("createGizmoModule was not found on window.");

    const module: GizmoModule = await window.createGizmoModule(
    {
        locateFile(path: string): string 
        {
            if (path.endsWith(".wasm"))
                return "/wasm/gizmo.wasm";

            return `/wasm/${path}`
        }

    });

    return module;
}

export function copy_bytes_in_wasm(module: GizmoModule, bytes: Uint8Array): number 
{

    const ptr: number = module._malloc(bytes.length);

    if (ptr === 0)
        throw new Error("WASM malloc failed");

    module.HEAPU8.set(bytes, ptr);

    return ptr;
}

export function free_bytes_in_wasm(module: GizmoModule, ptr: number): void 
{

    module._free(ptr);

}