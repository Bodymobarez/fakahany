import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1f7a3a',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 18,
            height: 22,
            background: '#ecfdf5',
            borderRadius: '50% 50% 45% 45%',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
