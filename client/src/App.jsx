import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://wry-near-principle.glitch.me');

function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef(null);
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  useEffect(() => {
    peerRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerRef.current.ontrack = (event) => {
      console.log('Received remote track');
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { room, candidate: event.candidate });
      }
    };

    socket.on('user-joined', async () => {
      console.log('User joined, creating offer');
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      socket.emit('offer', { room, offer });
    });

    socket.on('offer', async (offer) => {
      console.log('Received offer');
      await peerRef.current.setRemoteDescription(offer);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit('answer', { room, answer });
    });

    socket.on('answer', async (answer) => {
      console.log('Received answer');
      await peerRef.current.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [room]);

  const joinRoom = async () => {
    try {
      setJoined(true); // Ensure video elements are rendered before accessing refs

      // Wait for the DOM to update
      await new Promise(resolve => setTimeout(resolve, 0));

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Got media stream');

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => {
        peerRef.current.addTrack(track, stream);
      });

      socket.emit('join', room);
      console.log('Emitted join for room:', room);

    } catch (error) {
      console.error('Error in joinRoom:', error);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {!joined && (
        <div>
          <input
            placeholder="Enter Room ID"
            value={room}
            onChange={e => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      )}

      <div style={{ display: joined ? 'block' : 'none' }}>
        <h2>Room: {room}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '45%' }}
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '45%' }}
          />
        </div>
      </div>
    </div>
  );

}

export default App;
