import { useClockwise } from '../hooks';

interface Props {
  /** Direction to point in CSS degrees, or null to hide. */
  angle: number | null;
  /** Dimmed when pointing at the dealer rather than a player due to act. */
  muted?: boolean;
}

/** A pointer orbiting the centre of the screen. It always turns clockwise, like the action. */
export function TurnArrow({ angle, muted }: Props) {
  const rotation = useClockwise(angle);
  if (rotation == null) return null;
  return (
    <div
      className={`turn-arrow ${muted ? 'muted' : ''} ${angle == null ? 'hidden' : ''}`}
      style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40">
        <path d="M6 4 L36 20 L6 36 L14 20 Z" />
      </svg>
    </div>
  );
}
