import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

import './Navbar.css'

export const Theme =
{
    LIGHT: "light",
    DARK:   "dark",
};

type NavbarProps = 
{
    theme: string;
    set_theme: React.Dispatch<React.SetStateAction<string>>;
}


export function Navbar(props: NavbarProps): React.JSX.Element
{
    function toggle_theme()
    {
        const next_theme = (props.theme === Theme.DARK) ? Theme.LIGHT : Theme.DARK;
        props.set_theme(next_theme);
    }

    return (
        <div className="gizmo-navbar flex items-center">
            <h1 className="font-bold italic text-4xl py-4 ml-4">
                Gizmo GBC
            </h1> 

            <div className="flex flex-1 justify-around gap-12 mx-10">
                <Link to="/">Emulator</Link>
                <Link to="/demos">Demos</Link>
                <Link to="/controls">Controls</Link>
                <a
                    href="https://www.linkedin.com/in/trevor-rowe-a55658155/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Connect
                </a>
            </div>

            { (props.theme === Theme.DARK) &&
                <div className="flex gap-4 items-center mr-10">
                    <Sun  size={35} />
                    <label className="theme-toggle">
                        <input 
                            type="checkbox"
                            checked={ (props.theme === Theme.DARK) }
                            onChange={() => toggle_theme() }
                        />

                        <span className="theme-toggle-slider"/>
                    </label>
                    <Moon className="text-(--color-primary)" size={35} />
                </div>
            }
            { (props.theme === Theme.LIGHT) &&
                <div className="flex gap-4 items-center mr-10">
                    <Sun  className="text-(--color-primary)" size={35} />
                    <label className="theme-toggle">
                        <input 
                            type="checkbox"
                            checked={ (props.theme === Theme.DARK) }
                            onChange={() => toggle_theme() }
                        />

                        <span className="theme-toggle-slider"/>
                    </label>
                    <Moon size={35} />
                </div>
            }
        </div>
    );
}