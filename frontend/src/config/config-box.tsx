import { observer } from "mobx-react-lite";
import DraggableWindow from "../draggable-window";
import { counterStore } from "../chat-box";


export const ConfigContent = observer(() => {

    let selectedProvider = 'openrouter';
    let apiKey = '';
    return <>
        <div className="flex flex-col gap-6 text-sm text-zinc-800">

            <div className="flex flex-col gap-2">
                <label className="text-zinc-600 font-medium">Provider</label>
                <select id="provider" onChange={e => selectedProvider = e.target.value} defaultValue={selectedProvider}
                    className="px-3 py-2 rounded-xl bg-white/60 backdrop-blur border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40">
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google (Gemini)</option>
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-zinc-600 font-medium">API Key</label>
                <input type="password" placeholder="sk-..." onChange={(e) => apiKey = e.target.value}
                    className="px-3 py-2 rounded-xl bg-white/60 backdrop-blur border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
            </div>

            {/* <div className="flex flex-col gap-2 relative">
                <label className="text-zinc-600 font-medium">Model</label>

                <input id="modelSearch" type="text" placeholder="Search models..."
                    className="px-3 py-2 rounded-xl bg-white/60 backdrop-blur border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40" />

                <div id="modelDropdown" onFocus={() => selectingModel = true}
                    className={`absolute top-[72px] w-full max-h-48 overflow-y-auto rounded-xl bg-white/70 backdrop-blur border border-white/40 shadow-lg ${selectingModel ? '' : 'hidden'} z-10`}>

                    <div className="model-option px-3 py-2 hover:bg-blue-500/10 cursor-pointer">openai/gpt-4o</div>
                    <div className="model-option px-3 py-2 hover:bg-blue-500/10 cursor-pointer">openai/gpt-4.1</div>
                    <div className="model-option px-3 py-2 hover:bg-blue-500/10 cursor-pointer">anthropic/claude-3-opus</div>
                    <div className="model-option px-3 py-2 hover:bg-blue-500/10 cursor-pointer">anthropic/claude-3-sonnet</div>
                    <div className="model-option px-3 py-2 hover:bg-blue-500/10 cursor-pointer">google/gemini-pro</div>
                    <div className="model-option px-3 py-2 hover:bg-blue-500/10 cursor-pointer">meta/llama-3-70b</div>

                </div>
            </div> */}

            <div className="pt-2">
                <button onClick={() => counterStore.saveConfig({ provider: selectedProvider, apiKey, })}
                    className="w-full py-2 rounded-xl bg-gray-900/80 hover:bg-gray-900 text-white font-medium shadow-md transition">
                    Save Configuration
                </button>
            </div>

        </div>
        {/*
        <script>
            const searchInput = document.getElementById('modelSearch');
            const dropdown = document.getElementById('modelDropdown');
            const options = document.querySelectorAll('.model-option');

  searchInput.addEventListener('focus', () => {
                dropdown.classList.remove('hidden');
  });

  searchInput.addEventListener('input', () => {
    const value = searchInput.value.toLowerCase();

    options.forEach(opt => {
      const text = opt.textContent.toLowerCase();
            opt.style.display = text.includes(value) ? 'block' : 'none';
    });
  });

  options.forEach(opt => {
                opt.addEventListener('click', () => {
                    searchInput.value = opt.textContent;
                    dropdown.classList.add('hidden');
                });
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
    }
  });
        </script> */}
    </>;
});

export const ConfigBox = observer(() => {
    const m = { minimized: false, title: 'Configuration', id: -1, };

    return (<>
        <div>
            <DraggableWindow loading={false} data={m} modal={true} minimized={m.minimized} windowKey={'win' + m.id} key={'win' + m.id} title={m.title} h={310} w={400}>
                <ConfigContent />
            </DraggableWindow>
        </div>
    </>);
});