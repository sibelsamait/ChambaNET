import Avatar from './Avatar';

export default function ChatPanel() {
  const chats = [
    { id: 1, name: 'Empleador', msg: 'Hola como est...', active: true, imageUrl: null },
    { id: 2, name: 'Trabajador #1', msg: 'Hola como est...', active: false, imageUrl: null },
  ];

  return (
    <aside className="w-full border-t border-gray-200 bg-white flex flex-col flex-shrink-0 lg:w-72 lg:border-t-0 lg:border-l">
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        <h2 className="font-bold text-gray-900">Chat</h2>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-sm font-bold tracking-wider">EN OBRA</span>
      </div>
      <div className="max-h-72 overflow-y-auto lg:max-h-none lg:flex-1">
        {chats.map((chat) => (
          <div key={chat.id} className={`p-4 border-b border-gray-100 cursor-pointer transition flex items-center gap-3 ${chat.active ? 'bg-blue-50 border-l-4 border-l-blue-700' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}>
            <Avatar
              imageUrl={chat.imageUrl}
              name={chat.name}
              alt={`Foto de ${chat.name}`}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
              fallbackClassName="text-xs"
            />
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