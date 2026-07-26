import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

type Point = { x: number; y: number };
type Stroke = Point[];

type Props = {
  onChange: (svgDataUrl: string | null) => void;
};

const WIDTH = 320;
const HEIGHT = 140;

function toBase64(svg: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(svg)));
  }
  // Node / some runtimes
  const g = globalThis as { Buffer?: { from: (s: string, enc: string) => { toString: (e: string) => string } } };
  if (g.Buffer) return g.Buffer.from(svg, 'utf8').toString('base64');
  throw new Error('No base64 encoder');
}

function strokesToSvg(strokes: Stroke[]): string {
  const paths = strokes
    .filter((s) => s.length > 1)
    .map((stroke) => {
      const [first, ...rest] = stroke;
      if (!first) return '';
      const d = [`M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`]
        .concat(rest.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`))
        .join(' ');
      return `<path d="${d}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="100%" height="100%" fill="#fff"/>${paths}</svg>`;
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

export function SignaturePad({ onChange }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const live = useRef<Stroke>([]);
  const all = useRef<Stroke[]>([]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          live.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
          setStrokes([...all.current, live.current]);
        },
        onPanResponderMove: (e) => {
          live.current = [
            ...live.current,
            { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY },
          ];
          setStrokes([...all.current, live.current]);
        },
        onPanResponderRelease: () => {
          if (live.current.length > 1) {
            all.current = [...all.current, live.current];
          }
          live.current = [];
          setStrokes([...all.current]);
          onChange(all.current.length ? strokesToSvg(all.current) : null);
        },
      }),
    [onChange],
  );

  function clear() {
    all.current = [];
    live.current = [];
    setStrokes([]);
    onChange(null);
  }

  return (
    <View>
      <View style={styles.pad} {...pan.panHandlers}>
        {strokes.map((stroke, idx) =>
          stroke.slice(1).map((p, j) => {
            const a = stroke[j]!;
            const left = Math.min(a.x, p.x);
            const top = Math.min(a.y, p.y);
            const width = Math.max(2, Math.hypot(p.x - a.x, p.y - a.y));
            const angle = (Math.atan2(p.y - a.y, p.x - a.x) * 180) / Math.PI;
            return (
              <View
                key={`${idx}-${j}`}
                style={[
                  styles.segment,
                  {
                    left,
                    top,
                    width,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          }),
        )}
        {!strokes.length ? <Text style={styles.hint}>Sign here</Text> : null}
      </View>
      <Pressable onPress={clear} style={styles.clear}>
        <Text style={styles.clearText}>Clear signature</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: HEIGHT,
    width: '100%',
    maxWidth: WIDTH,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#0f172a',
    borderRadius: 2,
  },
  hint: { color: '#94a3b8', textAlign: 'center', marginTop: 56 },
  clear: { marginTop: 8, alignSelf: 'flex-start' },
  clearText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
});
