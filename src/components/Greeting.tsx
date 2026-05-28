import type { NextClass, User } from '../lib/types';

interface GreetingProps {
  user: User;
  nextClass: NextClass;
  small?: boolean;
}

export function Greeting({ user, nextClass, small }: GreetingProps) {
  return (
    <div className="greet">
      <div className="greet-eyebrow">
        <span className="dot" />
        <span>GV SCIENCE</span>
        <span style={{ color: 'var(--c-text-mute)' }}>·</span>
        <span>{user.grade}</span>
      </div>
      {!small && (
        <>
          <div className="greet-title">
            おかえり、<span className="name">{user.name}</span>さん
          </div>
          <div className="greet-sub">
            次の授業まで、あと {nextClass.daysLeft} 日。
          </div>
        </>
      )}
    </div>
  );
}
