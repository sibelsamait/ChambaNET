import Avatar from './Avatar';

export default function ChatPanel() {
  const chats = [
    { id: 1, name: 'Empleador', msg: 'Hola como est...', active: true, imageUrl: null },
    { id: 2, name: 'Trabajador #1', msg: 'Hola como est...', active: false, imageUrl: null },
    { id: 3, name: 'Trabajador #2', msg: 'Hola como est...', active: false, imageUrl: null },
    { id: 4, name: 'Trabajador #3', msg: 'Hola como est...', active: false, imageUrl: null },
    { id: 5, name: 'Trabajador #4', msg: 'Hola como est...', active: false, imageUrl: null },
    { id: 6, name: 'Trabajador #5', msg: 'Hola como est...', active: false, imageUrl: null },
  ];

  return (
    <aside className="flex w-full flex-shrink-0 flex-col border-t border-blue-200 bg-[#f2f2f2] lg:w-64 lg:border-t-0 lg:border-l lg:border-l-blue-200">
      <div className="flex h-14 items-center justify-between border-b border-blue-200 px-4">
        <h2 className="text-xl font-bold text-black">Chat</h2>
      </div>
      <div className="feed-scroll max-h-72 overflow-y-auto lg:max-h-none lg:flex-1">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className={`liftable flex w-full cursor-pointer items-center gap-2.5 border-b border-blue-100 px-3 py-2.5 text-left transition ${chat.active ? 'bg-blue-100/70' : 'hover:bg-blue-100/45'}`}
          >
            <Avatar
              imageUrl={chat.imageUrl}
              name={chat.name}
              alt={`Foto de ${chat.name}`}
              className="h-9 w-9 flex-shrink-0 rounded-full border border-blue-200 object-cover"
              fallbackClassName="text-xs"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-black">{chat.name}</p>
              <p className="truncate text-xs text-gray-700">{chat.msg}</p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}