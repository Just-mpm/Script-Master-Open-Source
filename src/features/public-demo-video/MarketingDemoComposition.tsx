import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from 'remotion';
import {
  TEXT_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  SUCCESS_MAIN,
  APP_BACKGROUND,
  WHITE_08,
} from '../../theme/tokens';

const WIDTH = 1280;
const HEIGHT = 720;
const MOBILE_WIDTH = 720;
const MOBILE_HEIGHT = 900;

const TEXT_MUTED = 'rgba(226, 232, 240, 0.66)';
const TEXT_SUBTLE = 'rgba(226, 232, 240, 0.48)';
const SURFACE = 'rgba(12, 18, 35, 0.88)';
const SURFACE_SOFT = 'rgba(15, 23, 42, 0.72)';
const BORDER = 'rgba(148, 163, 184, 0.18)';
const BLUE = BRAND_PRIMARY_LIGHT;
const BLUE_DEEP = BRAND_PRIMARY;
const ORANGE = BRAND_SECONDARY;
const GREEN = SUCCESS_MAIN;
const PURPLE = '#a78bfa';

export interface MarketingDemoCopy {
  scriptText: string;
  scriptLabel: string;
  studioLabel: string;
  aiLabel: string;
  activeLabel: string;
  statusTyping: string;
  statusCreating: string;
  statusReady: string;
  aiTitle: string;
  aiDescription: string;
  tags: readonly string[];
  workflowCards: readonly WorkflowCopy[];
  previewCaption: string;
  timelineLabel: string;
  finalTitle: string;
}

interface WorkflowCopy {
  label: string;
  detail: string;
}

interface WorkflowCard extends WorkflowCopy {
  color: string;
  from: number;
}

const WORKFLOW_CARD_META = [
  { color: BLUE, from: 118 },
  { color: ORANGE, from: 146 },
  { color: GREEN, from: 174 },
] as const;

function clampInterpolate(frame: number, input: readonly number[], output: readonly number[]): number {
  return interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
}

function typewriterText(frame: number, text: string): string {
  const progress = clampInterpolate(frame, [18, 96], [0, text.length]);
  return text.slice(0, Math.floor(progress));
}

function getWorkflowCards(copy: MarketingDemoCopy): WorkflowCard[] {
  return copy.workflowCards.map((card, index) => ({
    ...card,
    ...WORKFLOW_CARD_META[index],
  }));
}

function panelStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 22,
    boxShadow: '0 30px 80px rgba(2, 6, 23, 0.48)',
    ...extra,
  };
}

function enterStyle(frame: number, from: number, axis: 'x' | 'y' = 'y', distance = 18): CSSProperties {
  const opacity = clampInterpolate(frame, [from, from + 18], [0, 1]);
  const offset = clampInterpolate(frame, [from, from + 18], [distance, 0]);
  const transform = axis === 'x' ? `translateX(${offset}px)` : `translateY(${offset}px)`;

  return { opacity, transform };
}

function GlowField({ frame }: { frame: number }) {
  const drift = clampInterpolate(frame % 180, [0, 90, 180], [0, 1, 0]);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        width: 520,
        height: 520,
        left: -130 + drift * 24,
        top: 72,
        borderRadius: 999,
        background: 'radial-gradient(circle, rgba(46, 117, 182, 0.24), transparent 68%)',
      }} />
      <div style={{
        position: 'absolute',
        width: 430,
        height: 430,
        right: -90,
        bottom: 10 + drift * 18,
        borderRadius: 999,
        background: 'radial-gradient(circle, rgba(247, 148, 30, 0.18), transparent 70%)',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.045), transparent 38%, rgba(255,255,255,0.025))',
      }} />
    </AbsoluteFill>
  );
}

function StatusPill({ frame, copy }: { frame: number; copy: MarketingDemoCopy }) {
  const pulse = clampInterpolate(frame % 42, [0, 21, 42], [0.42, 1, 0.42]);
  const status = frame < 108 ? copy.statusTyping : frame < 194 ? copy.statusCreating : copy.statusReady;
  const activeColor = frame < 194 ? ORANGE : GREEN;

  return (
    <div style={{
      ...panelStyle({
        position: 'absolute',
        right: 48,
        top: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        maxWidth: 280,
        padding: '12px 16px',
        color: TEXT_PRIMARY,
        fontSize: 18,
        fontWeight: 780,
        whiteSpace: 'nowrap',
      }),
    }}>
      <span style={{
        width: 12,
        height: 12,
        flex: '0 0 auto',
        borderRadius: 999,
        background: activeColor,
        opacity: pulse,
        boxShadow: `0 0 26px ${activeColor}88`,
      }} />
      {status}
    </div>
  );
}

function ScriptPanel({ frame, copy }: { frame: number; copy: MarketingDemoCopy }) {
  const text = typewriterText(frame, copy.scriptText);
  const cursorOpacity = frame % 24 < 12 ? 1 : 0;
  const progress = clampInterpolate(frame, [18, 96], [4, 100]);

  return (
    <div style={{
      ...panelStyle({
        position: 'absolute',
        left: 48,
        top: 114,
        width: 608,
        height: 366,
        padding: 28,
      }),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: ORANGE,
          boxShadow: `0 0 20px ${ORANGE}77`,
        }} />
        <div style={{ color: TEXT_SUBTLE, fontSize: 17, fontWeight: 850 }}>
          {copy.scriptLabel}
        </div>
        <div style={{ marginLeft: 'auto', color: TEXT_SUBTLE, fontSize: 16, fontWeight: 720 }}>
          {Math.round(progress)}%
        </div>
      </div>
      <div style={{ color: TEXT_PRIMARY, fontSize: 33, lineHeight: 1.25, fontWeight: 690 }}>
        {text}
        <span style={{ opacity: cursorOpacity, color: ORANGE }}>|</span>
      </div>
      <div style={{
        position: 'absolute',
        left: 28,
        right: 28,
        bottom: 26,
        height: 14,
        borderRadius: 999,
        background: WHITE_08,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          borderRadius: 999,
          background: `linear-gradient(90deg, ${BLUE_DEEP}, ${ORANGE})`,
        }} />
      </div>
      <div style={{ position: 'absolute', left: 28, right: 28, bottom: 54, display: 'flex', gap: 10 }}>
        {copy.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: '7px 10px',
              borderRadius: 999,
              color: TEXT_MUTED,
              fontSize: 13,
              fontWeight: 760,
              background: 'rgba(148, 163, 184, 0.11)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function AiPanel({ frame, copy }: { frame: number; copy: MarketingDemoCopy }) {
  const progress = clampInterpolate(frame, [100, 188], [14, 100]);

  return (
    <div style={{
      ...panelStyle({
        position: 'absolute',
        right: 48,
        top: 118,
        width: 456,
        height: 174,
        padding: 24,
        ...enterStyle(frame, 78),
      }),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: TEXT_PRIMARY, fontSize: 22, fontWeight: 840 }}>
        <span>{copy.aiTitle}</span>
        <span style={{ color: ORANGE }}>{copy.activeLabel}</span>
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 17, lineHeight: 1.36, marginTop: 14 }}>
        {copy.aiDescription}
      </div>
      <div style={{ height: 12, marginTop: 22, borderRadius: 999, background: WHITE_08, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${BLUE}, ${ORANGE})` }} />
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
        {[0, 1, 2, 3].map((index) => {
          const isActive = progress > 18 + index * 22;
          return (
            <span
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: isActive ? ORANGE : 'rgba(148, 163, 184, 0.2)',
                boxShadow: isActive ? `0 0 14px ${ORANGE}66` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function WorkflowCardItem({ card, frame }: { card: WorkflowCard; frame: number }) {
  return (
    <div style={{
      ...panelStyle({
        width: 146,
        height: 124,
        padding: 17,
        ...enterStyle(frame, card.from, 'x', 26),
      }),
    }}>
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: card.color,
        boxShadow: `0 0 28px ${card.color}55`,
        marginBottom: 14,
      }} />
      <div style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 840, lineHeight: 1.1 }}>{card.label}</div>
      <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 5, lineHeight: 1.2 }}>{card.detail}</div>
    </div>
  );
}

function WorkflowCards({ frame, copy }: { frame: number; copy: MarketingDemoCopy }) {
  const cards = getWorkflowCards(copy);

  return (
    <div style={{ position: 'absolute', right: 48, top: 320, display: 'flex', gap: 14 }}>
      {cards.map((card) => (
        <WorkflowCardItem key={card.label} card={card} frame={frame} />
      ))}
    </div>
  );
}

function VideoPreview({ frame, copy }: { frame: number; copy: MarketingDemoCopy }) {
  const opacity = clampInterpolate(frame, [194, 226], [0, 1]);
  const scale = clampInterpolate(frame, [194, 226], [0.96, 1]);
  const captionOpacity = clampInterpolate(frame, [226, 250], [0, 1]);
  const sceneShift = clampInterpolate(frame, [226, 286], [0, -24]);

  return (
    <div style={{
      ...panelStyle({
        position: 'absolute',
        right: 48,
        bottom: 154,
        width: 456,
        height: 174,
        overflow: 'hidden',
        opacity,
        transform: `scale(${scale})`,
      }),
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, rgba(46,117,182,0.78), rgba(15,23,42,0.54) 46%, rgba(247,148,30,0.7)), linear-gradient(90deg, ${BLUE_DEEP}, ${PURPLE})`,
      }} />
      <div style={{
        position: 'absolute',
        left: 26 + sceneShift,
        top: 26,
        width: 154,
        height: 104,
        borderRadius: 18,
        background: 'rgba(248, 250, 252, 0.88)',
        opacity: 0.28,
      }} />
      <div style={{
        position: 'absolute',
        right: 28,
        top: 24,
        width: 162,
        height: 96,
        borderRadius: 18,
        background: 'rgba(5, 8, 22, 0.32)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
      }} />
      <div style={{
        position: 'absolute',
        left: 28,
        right: 28,
        bottom: 22,
        padding: '9px 14px',
        borderRadius: 999,
        color: TEXT_PRIMARY,
        fontSize: 14,
        fontWeight: 800,
        textAlign: 'center',
        opacity: captionOpacity,
        background: 'rgba(2, 6, 23, 0.58)',
      }}>
        {copy.previewCaption}
      </div>
    </div>
  );
}

function TimelinePreview({ frame, copy }: { frame: number; copy: MarketingDemoCopy }) {
  const playhead = clampInterpolate(frame, [210, 286], [10, 92]);

  return (
    <div style={{
      ...panelStyle({
        position: 'absolute',
        left: 48,
        right: 48,
        bottom: 42,
        height: 104,
        padding: '18px 24px',
        ...enterStyle(frame, 182, 'y', 20),
      }),
    }}>
      <div style={{ color: TEXT_SUBTLE, fontSize: 16, fontWeight: 850, marginBottom: 14 }}>
        {copy.timelineLabel}
      </div>
      <div style={{ position: 'relative', display: 'flex', gap: 10, height: 36 }}>
        {[BLUE_DEEP, ORANGE, GREEN, BLUE, ORANGE].map((color, index) => (
          <div key={`${color}-${index}`} style={{ flex: index === 1 ? 1.25 : 1, borderRadius: 10, background: color, opacity: 0.84 }} />
        ))}
        <div style={{
          position: 'absolute',
          left: `${playhead}%`,
          top: -8,
          width: 4,
          height: 52,
          borderRadius: 999,
          background: TEXT_PRIMARY,
          boxShadow: '0 0 24px rgba(248, 250, 252, 0.5)',
        }} />
      </div>
    </div>
  );
}

function BrowserChrome({ children, copy }: { children: ReactNode; copy: MarketingDemoCopy }) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: APP_BACKGROUND, fontFamily: 'Inter, Arial, sans-serif' }}>
      <GlowField frame={frame} />
      <div style={{
        position: 'absolute',
        inset: 28,
        borderRadius: 32,
        background: 'linear-gradient(180deg, rgba(10, 15, 32, 0.96), rgba(5, 8, 22, 0.98))',
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 28px',
          borderBottom: `1px solid ${WHITE_08}`,
          color: TEXT_PRIMARY,
          fontSize: 24,
          fontWeight: 850,
        }}>
          <span style={{ color: BLUE }}>Script</span>
          <span style={{ color: ORANGE }}>Master</span>
          <span style={{ marginLeft: 'auto', fontSize: 18, color: TEXT_MUTED, fontWeight: 700 }}>
            {copy.studioLabel}
          </span>
        </div>
        {children}
      </div>
    </AbsoluteFill>
  );
}

export function MarketingDemoComposition({ copy }: { copy: MarketingDemoCopy }) {
  const frame = useCurrentFrame();

  return (
    <BrowserChrome copy={copy}>
      <ScriptPanel frame={frame} copy={copy} />
      <Sequence from={70} premountFor={30}>
        <AiPanel frame={frame} copy={copy} />
      </Sequence>
      <Sequence from={100} premountFor={30}>
        <WorkflowCards frame={frame} copy={copy} />
      </Sequence>
      <Sequence from={176} premountFor={30}>
        <VideoPreview frame={frame} copy={copy} />
      </Sequence>
      <Sequence from={176} premountFor={30}>
        <TimelinePreview frame={frame} copy={copy} />
      </Sequence>
      <StatusPill frame={frame} copy={copy} />
    </BrowserChrome>
  );
}

function MobileStepCard({ label, color, frame, from, left }: WorkflowCard & { frame: number; left: number }) {
  return (
    <div style={{
      ...panelStyle({
        position: 'absolute',
        left,
        top: 548,
        width: 190,
        height: 92,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        ...enterStyle(frame, from),
      }),
    }}>
      <div style={{
        width: 28,
        height: 28,
        flex: '0 0 auto',
        borderRadius: 12,
        background: color,
        boxShadow: `0 0 26px ${color}55`,
      }} />
      <div style={{ color: TEXT_PRIMARY, fontSize: 19, fontWeight: 850, lineHeight: 1.1, textAlign: 'center' }}>{label}</div>
    </div>
  );
}

export function MarketingDemoMobileComposition({ copy }: { copy: MarketingDemoCopy }) {
  const frame = useCurrentFrame();
  const typedText = typewriterText(frame, copy.scriptText);
  const cursorOpacity = frame % 24 < 12 ? 1 : 0;
  const aiOpacity = clampInterpolate(frame, [72, 108], [0, 1]);
  const progress = clampInterpolate(frame, [100, 188], [12, 100]);
  const finalOpacity = clampInterpolate(frame, [206, 238], [0, 1]);
  const finalY = clampInterpolate(frame, [206, 238], [14, 0]);
  const playhead = clampInterpolate(frame, [210, 286], [12, 88]);
  const cards = getWorkflowCards(copy);

  return (
    <AbsoluteFill style={{ background: APP_BACKGROUND, fontFamily: 'Inter, Arial, sans-serif', padding: 24 }}>
      <GlowField frame={frame} />
      <div style={{
        ...panelStyle({
          height: '100%',
          padding: 26,
          background: 'linear-gradient(180deg, rgba(10, 15, 32, 0.98), rgba(5, 8, 22, 0.98))',
          position: 'relative',
          overflow: 'hidden',
        }),
      }}>
        <div style={{
          position: 'absolute',
          left: 26,
          right: 26,
          top: 24,
          display: 'flex',
          justifyContent: 'space-between',
          color: TEXT_PRIMARY,
          fontSize: 28,
          fontWeight: 900,
        }}>
          <span><span style={{ color: BLUE }}>Script</span> <span style={{ color: ORANGE }}>Master</span></span>
          <span style={{ color: ORANGE, fontSize: 22 }}>{copy.aiLabel}</span>
        </div>

        <div style={{
          ...panelStyle({
            position: 'absolute',
            left: 26,
            right: 26,
            top: 92,
            height: 262,
            padding: 22,
            background: SURFACE_SOFT,
          }),
        }}>
          <div style={{ color: TEXT_SUBTLE, fontSize: 19, fontWeight: 850, marginBottom: 14 }}>
            {copy.scriptLabel}
          </div>
          <div style={{ color: TEXT_PRIMARY, fontSize: 28, lineHeight: 1.16, fontWeight: 760 }}>
            {typedText}
            <span style={{ opacity: cursorOpacity, color: ORANGE }}>|</span>
          </div>
        </div>

        <div style={{
          ...panelStyle({
            position: 'absolute',
            left: 26,
            right: 26,
            top: 374,
            height: 168,
            padding: 22,
            opacity: aiOpacity,
          }),
        }}>
          <div style={{ color: TEXT_PRIMARY, fontSize: 24, fontWeight: 850 }}>{copy.statusCreating}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 18, lineHeight: 1.3, marginTop: 8 }}>
            {copy.aiDescription}
          </div>
          <div style={{ height: 11, marginTop: 16, borderRadius: 999, background: WHITE_08, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${BLUE}, ${ORANGE})` }} />
          </div>
        </div>

        {cards.map((card, index) => (
          <MobileStepCard key={card.label} {...card} frame={frame} left={26 + index * 206 } />
        ))}

        <div style={{
          ...panelStyle({
            position: 'absolute',
            left: 26,
            right: 26,
            bottom: 28,
            height: 180,
            padding: '18px 18px',
            ...enterStyle(frame, 196, 'y', 16),
          }),
        }}>
          <div style={{ color: TEXT_SUBTLE, fontSize: 15, fontWeight: 850, marginBottom: 12 }}>
            {copy.timelineLabel}
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 8, height: 24 }}>
            {[BLUE_DEEP, ORANGE, GREEN, BLUE].map((color, index) => (
              <div key={`${color}-${index}`} style={{ flex: 1, borderRadius: 8, background: color, opacity: 0.84 }} />
            ))}
            <div style={{
              position: 'absolute',
              left: `${playhead}%`,
              top: -6,
              width: 4,
              height: 36,
              borderRadius: 999,
              background: TEXT_PRIMARY,
              boxShadow: '0 0 20px rgba(248, 250, 252, 0.5)',
            }} />
          </div>
          <div style={{
            marginTop: 30,
            color: TEXT_PRIMARY,
            fontSize: 30,
            lineHeight: 1.08,
            fontWeight: 950,
            opacity: finalOpacity,
            transform: `translateY(${finalY}px)`,
          }}>
            {copy.finalTitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const MARKETING_DEMO_COMPOSITION = {
  width: WIDTH,
  height: HEIGHT,
  fps: 30,
  durationInFrames: 300,
} as const;

export const MARKETING_DEMO_MOBILE_COMPOSITION = {
  width: MOBILE_WIDTH,
  height: MOBILE_HEIGHT,
  fps: 30,
  durationInFrames: 300,
} as const;
