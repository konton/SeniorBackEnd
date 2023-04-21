import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import numpy as np
from scipy.signal import bessel, filtfilt, find_peaks
from numpy import asarray
from numpy import savetxt


cred = credentials.Certificate(
    r"/Users/dome/Desktop/Senior Project/SeniorBackEnd/admin.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://fluted-arch-341414-default-rtdb.asia-southeast1.firebasedatabase.app/'
})



def bessel_bandpass_filter(data, lowcut, highcut, fs, order=4):
    nyquist = 0.5 * fs
    low = lowcut / nyquist
    high = highcut / nyquist
    b, a = bessel(order, [low, high], btype='band')
    y = filtfilt(b, a, data)
    return y


ref = db.reference('Red/value')


def findRR():
    fs = 25  # Sampling frequency
    lowcut = 0.3  # Low cut-off frequency (Hz)
    highcut = 0.6  # High cut-off frequency (Hz)
    order = 2  # Filter order
    # Define minimum and maximum breath rates
    min_breath_rate = 5  # breaths per minute
    max_breath_rate = 26  # breaths per minute
    note = []

    red = ref.get()
    avgdata = np.mean(red)
    if(avgdata>1400000 and avgdata<1500000):
        lowcut=0.3
        highcut=0.6
        order=4
    elif (avgdata>1700000 and avgdata<1800000):
        lowcut=0.3
        highcut=0.6
        order=2
    elif (avgdata>1800000):
        lowcut=0.5
        highcut=0.6
        order=2

    filtered_red = bessel_bandpass_filter(red, lowcut, highcut, fs, order)
    # Find the minimum and maximum peak-to-peak amplitudes
    min_amplitude = filtered_red.min()
    max_amplitude = filtered_red.max()

    # Find the minimum and maximum breath durations
    min_duration = int(60 / max_breath_rate * fs)
    max_duration = int(60 / min_breath_rate * fs)

    segment_lengths = np.arange(min_duration, max_duration, step=fs)
    breath_rates = []

    for segment_length in segment_lengths:
        # Segment the filtered signal into breath segments
        segment_size = int(segment_length)
        num_segments = int(len(filtered_red) / segment_size)
        segments = np.array_split(
            filtered_red[:num_segments*segment_size], num_segments)

        # Extract breath features for each segment
        breath_features = []

        for segment in segments:
            # Find peaks in the segment
            peaks, _ = find_peaks(
                segment, height=0, distance=int(segment_length/2))
            # Calculate peak-to-peak amplitude and duration for each breath
            for i in range(len(peaks)-1):
                p2p = segment[peaks[i+1]] - segment[peaks[i]]
                duration = (peaks[i+1] - peaks[i]) / fs
                breath_features.append((p2p, duration))

        # Calculate the average respiration rate over the entire signal
        breath_features = np.array(breath_features)
        respiration_rate = len(breath_features) / (len(filtered_red) / fs) * 60
        breath_rates.append(respiration_rate)

    optimal_segment_length = segment_lengths[np.argmin(
        np.abs(np.array(breath_rates) - (min_breath_rate + max_breath_rate)/2))]
    #                 print("Optimal segment length: %.2f seconds" % (optimal_segment_length/fs))
    optimal_length = round(optimal_segment_length/fs)

    segment_size = int(optimal_length * fs)
    num_segments = int(len(filtered_red) / segment_size)
    segments = np.array_split(
        filtered_red[:num_segments*segment_size], num_segments)
    breath_features = []
    for segment in segments:
        # Find peaks in the segment
        peaks, _ = find_peaks(segment, height=0)
        # Calculate peak-to-peak amplitude and duration for each breath
        for i in range(len(peaks)-1):
            p2p = segment[peaks[i+1]] - segment[peaks[i]]
            duration = (peaks[i+1] - peaks[i]) / fs
            breath_features.append((p2p, duration))

    # Calculate the average respiration rate over the entire signal
    breath_features = np.array(breath_features)
    respiration_rate = len(breath_features) / (len(filtered_red) / fs) * 60
    return respiration_rate

if __name__ == '__main__':
    var = findRR()
    var = round(var, 0)
    print(var)
