

export function Controls(): React.JSX.Element
{
    return (
        <div className="
            flex justify-center items-center
            bg-(--color-surface)
            w-full h-full
        ">

            <div className="w-4/5 h-4/5">
            <img 
                src="./images/controls.png" 
                className="
                    bg-(--color-surface-secondary)
                    border border-(--color-text)
                    w-full h-full
                "    
            />
            </div>

        </div>
    );
}