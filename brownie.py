#!/usr/bin/env python3
import tkinter as tk
import numpy as np
import sounddevice as sd
from scipy import signal

SAMPLE_RATE = 44100
CHUNK = 8192
ALPHA = 0.995

# DO NOT combine these as _zi_left = _zi_right = np.array([0.0])
# Both variables would point to the same array in memory and modifying one would modify the other
_zi_left = np.array([0.0])
_zi_right = np.array([0.0])

stream = None

def generate_channel(frames, zi, amplitude):
    white = np.random.normal(0, 1, frames)
    brown, zi = signal.lfilter([1.0], [1.0, -ALPHA], white, zi=zi)
    expected_std = 1.0 / np.sqrt(1.0 - ALPHA**2)
    return (brown / expected_std * amplitude).reshape(-1, 1), zi

def make_callback(channels, amplitude_ref):
    def callback(outdata, frames, time, status):
        global _zi_left, _zi_right
        amplitude = amplitude_ref()
        left, _zi_left = generate_channel(frames, _zi_left, amplitude)
        if channels == 2:
            right, _zi_right = generate_channel(frames, _zi_right, amplitude)
            outdata[:] = np.hstack([left, right])
        else:
            outdata[:] = left
    return callback

def start_stream(channels, amplitude_ref):
    global stream, _zi_left, _zi_right
    _zi_left = np.array([0.0])
    _zi_right = np.array([0.0])
    stream = sd.OutputStream(
        samplerate=SAMPLE_RATE,
        channels=channels,
        blocksize=CHUNK,
        callback=make_callback(channels, amplitude_ref)
    )
    stream.start()

def stop_stream():
    global stream
    if stream:
        stream.stop()
        stream.close()
        stream = None

def build_ui():
    root = tk.Tk()
    root.title("Brown Noise")
    root.resizable(False, False)

    stereo_var = tk.BooleanVar(value=False)
    volume_var = tk.IntVar(value=30)

    def amplitude_ref():
        return volume_var.get() / 100

    def toggle():
        if stream is None:
            start_stream(2 if stereo_var.get() else 1, amplitude_ref)
            play_btn.config(text="Pause")
        else:
            stop_stream()
            play_btn.config(text="Play")

    frame = tk.Frame(root, padx=20, pady=20)
    frame.pack()

    play_btn = tk.Button(frame, text="Play", width=10, command=toggle)
    play_btn.pack(pady=(0, 15))

    tk.Label(frame, text="Volume").pack(anchor="w")
    tk.Scale(frame, from_=0, to=100, orient=tk.HORIZONTAL,
             variable=volume_var, length=200, showvalue=False,
             troughcolor="brown").pack()

    tk.Checkbutton(frame, text="Stereo", variable=stereo_var).pack(
        anchor="w", pady=(10, 0))

    root.mainloop()
    stop_stream()

build_ui()
