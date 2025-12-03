import { clsx } from 'clsx';

const Card = ({ children, className = '', onClick, hover = false }) => {
  return (
    <div
      className={clsx(
        'bg-gray-800 rounded-lg border border-gray-700 p-6',
        hover && 'hover:border-gray-600 transition-colors cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;


