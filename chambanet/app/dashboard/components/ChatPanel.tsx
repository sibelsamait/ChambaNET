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
    <aside className="flex w-full flex-shrink-0 flex-col border-t border-blue-200 bg-[#f2f2f2] lg:w-80 lg:border-t-0 lg:border-l lg:border-l-blue-200">
      <div className="flex h-20 items-center justify-between border-b border-blue-200 px-6">
        <h2 className="text-4xl font-extrabold text-black sm:text-6xl">Chat</h2>
      </div>
      <div className="feed-scroll max-h-72 overflow-y-auto lg:max-h-none lg:flex-1">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className={`liftable flex w-full cursor-pointer items-center gap-3 border-b border-blue-100 px-4 py-4 text-left transition ${chat.active ? 'bg-blue-100/70' : 'hover:bg-blue-100/45'}`}
          >
            <Avatar
              imageUrl={chat.imageUrl}
              name={chat.name}
              alt={`Foto de ${chat.name}`}
              className="h-12 w-12 flex-shrink-0 rounded-full border border-blue-200 object-cover sm:h-16 sm:w-16"
              fallbackClassName="text-xs"
            />
            <div className="overflow-hidden">
              <p className="text-2xl font-extrabold text-black sm:text-4xl">{chat.name}</p>
              <p className="truncate text-base text-gray-700 sm:text-2xl">{chat.msg}</p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}