export default function ChatPanel() {
  const chats = [
    { id: 1, name: "Empleador", msg: "Hola como est...", active: true },
    { id: 2, name: "Trabajador #1", msg: "Hola como est...", active: false },
  ];

  return (
    <aside className="w-72 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        <h2 className="font-bold text-gray-900">Chat</h2>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-sm font-bold tracking-wider">EN OBRA</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div key={chat.id} className={`p-4 border-b border-gray-100 cursor-pointer transition flex items-center gap-3 ${chat.active ? 'bg-blue-50 border-l-4 border-l-blue-700' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}>
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="overflow-hidden">
              <p className={`text-sm font-bold ${chat.active ? 'text-gray-900' : 'text-gray-700'}`}>{chat.name}</p>
              <p className="text-xs text-gray-500 truncate">{chat.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}