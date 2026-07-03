import { useState } from 'react';
import { type NavigateFunction, useNavigate } from 'react-router-dom';

// Data
import rom_json from '../../data/roms.json';

// Styling
import './Demos.css';

type RomMetaData =
{
    id:          number;
    img:         string;
    name:        string;
    path:        string;
    tags: Array<string>;
}

const rom_library: RomMetaData[] = rom_json.ROMS;

export function Demos(): React.JSX.Element
{
    const [search_input, set_search_input] = useState<string>("");

    const COLUMNS: number = 4;

    const navigate: NavigateFunction = useNavigate();

    function play_rom(rom_name: string, rom_path: string): void
    {
        navigate("/", 
        {
            state:
            {
                rom_name,
                rom_path
            }
        })
    }

    return (
        <div className="
            bg-(--color-surface)
            flex flex-col items-center
            w-full h-full
        ">
            <input
                type="text"
                value={search_input}
                onChange={(event) => { set_search_input(event.target.value); }}
                className="library-search-input"    
            />

            <div className="rom-display-area scrollbar">
                {
                    rom_library.filter((rom) => {

                        return rom.name
                            .toLowerCase()
                            .includes(search_input.toLowerCase());

                    }).map((rom, index) => 
                    (
                        <div
                            key={rom.id}
                            className="glow rom-card"
                            style=
                            {{
                                animationDelay: `${Math.floor(index / COLUMNS) * 150}ms`
                            }}
                        >
                            <img
                                src={rom.img}
                                alt={rom.name}
                                className="rom-image" 
                            />

                            <button 
                                className="play-button btn-primary"
                                onClick={() => 
                                {
                                    play_rom(rom.name, rom.path);
                                }}    
                            >
                                Play
                            </button>
                        </div>
                    ))
                }
            </div>

        </div>
    );
}