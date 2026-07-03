
import { load_gizmo } from './gizmo/gizmo.ts';
import { type GizmoModule } from './gizmo/types.ts'
import { Gizmo } from './pages/GizmoGameBoy/GizmoGameBoy.tsx';

import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Demos } from './pages/Demos/Demos.tsx';
import { Navbar, Theme } from './components/navbars/Navbar/Navbar.tsx';
import { DEFAULT_SPEED, DEFAULT_VOLUME, MAX_TURBO, MAX_VOLUME } from './components/sidebars/ControlSidebar/ControlSidebar.tsx';
import type { SaveStateSlot } from './components/sidebars/SaveStateSidebar/SaveStateSidebar.tsx';
import { Controls } from './pages/Directions/Directions.tsx';

import './App.css'

const STEREO_FRAME_CAPACITY = 4096;
const READ_INDEX            =    0;
const WRITE_INDEX           =    1;

function App(): React.JSX.Element 
{
  const [collapsed, set_collapsed] = useState<boolean>(false);
  const [save_states, set_save_states] = useState<SaveStateSlot[]>([]);
  const [selected_save_state, set_selected_save_state] = useState<SaveStateSlot | null>(null)

  const [emu, set_emu] = useState<number>(0);
  const [module, set_module] = useState<GizmoModule | null>(null);
  const [muted, set_muted] = useState<boolean>(true);
  const [theme, set_theme] = useState<string>(() => 
  {
    const saved_theme = localStorage.getItem("theme");
    return saved_theme ?? Theme.DARK;
  });

  // Audio
  const audio_ctx_ref     = useRef<AudioContext | null>(null);
  const audio_node_ref    = useRef<AudioWorkletNode | null>(null);
  const audio_ctrl_ref    = useRef<Int32Array | null>(null);
  const audio_samples_ref = useRef<Int16Array | null>(null);

  // Runtime State
  const emu_ref = useRef<number>(emu);

  const volume_ref = useRef<number>(DEFAULT_VOLUME);
  const speed_ref = useRef<number>(DEFAULT_SPEED);
  const turbo_ref = useRef<number>(MAX_TURBO);

  function clear_audio_buffer(): void
  {
      const ctrl = audio_ctrl_ref.current;
      const samples = audio_samples_ref.current;

      if (!ctrl || !samples)
          return;

      samples.fill(0);

      Atomics.store(ctrl, READ_INDEX, 0);
      Atomics.store(ctrl, WRITE_INDEX, 0);
  }

  function feed_audio_samples(sample_count: number): void
  {
      const ctrl    = audio_ctrl_ref.current;
      const samples = audio_samples_ref.current;

      if (
          !module 
          || !ctrl 
          || !samples 
          || (speed_ref.current > DEFAULT_SPEED) 
          || (volume_ref.current === 0)
      )
          return;

      let write = Atomics.load(ctrl, WRITE_INDEX);
      const capacity = samples.length;

      for (let i = 0; i < sample_count; i++)
      {
          const packed = module._sample_gizmo_audio();

          const left_i16  = packed >> 16;
          const right_i16 = (packed << 16) >> 16;

          samples[write] = (left_i16 / ((MAX_VOLUME - volume_ref.current) + 1));
          write = (write + 1) % capacity;

          samples[write] = (right_i16 / ((MAX_VOLUME - volume_ref.current) + 1));
          write = (write + 1) % capacity;
      }

      Atomics.store(ctrl, WRITE_INDEX, write);
  }

  async function start_audio(): Promise<void>
  {
      if (audio_ctx_ref.current)
          return;

      const ctx = new AudioContext({ sampleRate: 44100 });

      await ctx.audioWorklet.addModule("/audio/gizmo-audio.js");
      
      const node = new AudioWorkletNode(
          ctx,
          "gizmo-audio",
          {
              numberOfInputs:       0,
              numberOfOutputs:      1,
              outputChannelCount: [2],
          }
      );

      const sample_capacity = STEREO_FRAME_CAPACITY;

      const ctrl_buffer = new SharedArrayBuffer(
          2 * Int32Array.BYTES_PER_ELEMENT
      );
      
      const sample_buffer = new SharedArrayBuffer(
          sample_capacity * Int16Array.BYTES_PER_ELEMENT
      );

      const ctrl = new Int32Array(ctrl_buffer);

      const samples = new Int16Array(sample_buffer);

      Atomics.store(ctrl, READ_INDEX, 0);
      Atomics.store(ctrl, WRITE_INDEX, 0);

      node.port.postMessage({ ctrl_buffer, sample_buffer });

      node.connect(ctx.destination);

      audio_ctx_ref.current = ctx;
      audio_node_ref.current = node;

      audio_ctrl_ref.current = ctrl;
      audio_samples_ref.current = samples;
  }

  async function stop_audio(): Promise<void>
  {
      clear_audio_buffer();
  
      audio_node_ref.current?.disconnect();

      if (audio_ctx_ref.current)
          await audio_ctx_ref.current.close();

      audio_ctx_ref.current = null;
      audio_node_ref.current = null;

      audio_ctrl_ref.current = null;
      audio_samples_ref.current = null;
  }

  function clear_save_states()
  {
      if (!module)
          return;

      for (let i = 0; i < save_states.length; i++)
      {
          const emu = save_states[i].emu;

          if (emu !== 0)
              module._destroy_gizmo_emulator(emu);
      }

      set_save_states([]);
      set_selected_save_state(null);
  }

  useEffect(() => 
  {
    let loaded_module: GizmoModule | null = null;
    let cancelled = false;

    async function create_module(): Promise<void>
    {
      try 
      {
        const fresh_module = await load_gizmo();

        if (cancelled) 
          return;

        fresh_module._setup_gizmo();
        loaded_module = fresh_module;
        set_module(fresh_module);

      } catch (error)
      {
        console.error(error);
      }
    }

    create_module();

    return () => 
    {
      cancelled = true;
      loaded_module?._clean_gizmo();
      clear_save_states();
      loaded_module?._destroy_gizmo_emulator(emu_ref.current);
    };

  }, []);

  useEffect(() => 
  {
    if (muted)
    {
      stop_audio;
      return;
    }

    start_audio();

    return (() => 
    {
      stop_audio();

    });

  }, [muted]);

  useEffect(() => 
  {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("theme", theme);
  
  }, [theme]);

  return (
    <BrowserRouter>
      <main className="w-full h-full overflow-y-scroll">
        <Navbar 
          theme={theme}
          set_theme={set_theme}
        />
        <Routes>
          <Route 
            path="/"
            element=
            { 
              (module) && 
                <Gizmo 
                  module={module} 

                  emu_ref={emu_ref}
                  emu={emu}
                  set_emu={set_emu}

                  muted={muted}
                  set_muted={set_muted}

                  collapsed={collapsed}
                  set_collapsed={set_collapsed}

                  save_states={save_states}
                  set_save_states={set_save_states}

                  selected_save_state={selected_save_state}
                  set_selected_save_state={set_selected_save_state}

                  volume_ref={volume_ref}
                  turbo_ref={turbo_ref}
                  speed_ref={speed_ref}
                  
                  clear_audio_buffer={clear_audio_buffer}
                  feed_audio_samples={feed_audio_samples}
                  clear_save_states={clear_save_states}
                /> 
            }
          />
          <Route 
            path="/demos"
            element={ <Demos />}
          />
          <Route 
            path="/controls"
            element={ <Controls /> }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
