const READ_INDEX  = 0;
const WRITE_INDEX = 1;

class GizmoAudioProcessor extends AudioWorkletProcessor
{
    constructor()
    {
        super();

        this.   ctrl = null;
        this.samples = null;

        this.port.onmessage = (event) =>
        {
            this.ctrl    = new Int32Array(event.data.ctrl_buffer);
            this.samples = new Int16Array(event.data.sample_buffer);
        };
    }

    process(inputs, outputs)
    {
        const output = outputs[0];
        const left   =  output[0];
        const right  =  output[1];
        
        if (!this.ctrl || !this.samples)
        { 
            left.fill(0);
            right.fill(0);
            return true;    
        }

        let    read_index = Atomics.load(this.ctrl, READ_INDEX);
        const write_index = Atomics.load(this.ctrl, WRITE_INDEX);
        const    capacity = this.samples.length;

        for (let i = 0; i < left.length; i++)
        {
            if (read_index == write_index)
            {
                left[i]  = 0;
                right[i] = 0;
                continue;
            }

            const l = this.samples[read_index];
            read_index = (read_index + 1) % capacity;

            const r = this.samples[read_index];
            read_index = (read_index + 1) % capacity;

            left[i]  = l / 32768.0;
            right[i] = r / 32768.0;
        }

        Atomics.store(this.ctrl, READ_INDEX, read_index);

        return true;
    }
}

registerProcessor("gizmo-audio", GizmoAudioProcessor);