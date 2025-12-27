# Open-Source Music Generation and Voice-to-Singing Models for Mobile App Development

**Date:** December 22, 2025

**Author:** Manus AI

## 1. Introduction

This report provides a comprehensive overview of open-source algorithms for music generation and voice-to-singing conversion, with a focus on models available on Hugging Face. The research was conducted to identify suitable technologies for developing a mobile application similar to Suno, which would include features for both generating music from text and converting a user's voice into a singing voice. This document details the key models, their capabilities, and provides recommendations for mobile app development.

## 2. Suno-like Music Generation Models

This section explores open-source models that offer text-to-music generation capabilities, similar to Suno.ai. These models are capable of creating original music from textual descriptions.

### 2.1. YuE (乐)

YuE is a groundbreaking open-source foundation model for full-song music generation from lyrics, making it the most direct open-source competitor to Suno.ai [1]. Developed by researchers at HKUST and M-A-P, YuE can generate complete songs with vocals and accompaniment, spanning multiple languages and genres. Its ability to perform in-context learning (ICL) allows for style transfer and voice cloning from reference audio, a powerful feature for a mobile app. The model is released under the permissive Apache 2.0 license, encouraging commercial use [2].

### 2.2. MusicGen

Developed by Meta AI, MusicGen is a high-quality text-to-music model that can also be conditioned on an audio prompt [3]. It is an auto-regressive Transformer model that generates all four codebooks of a 32kHz EnCodec tokenizer in a single pass, making it efficient. While the code is MIT licensed, the model weights are under a non-commercial license (CC-BY-NC 4.0), which would be a significant consideration for a commercial mobile app [4].

### 2.3. Riffusion

Riffusion takes a novel approach by fine-tuning Stable Diffusion to generate spectrograms, which are then converted to audio [5]. This allows for real-time music generation and modification. While creative, the indirect nature of spectrogram generation may offer less control over the final audio compared to models that generate audio directly.

### 2.4. AudioLDM 2

AudioLDM 2 is a versatile latent diffusion model that excels at both text-to-audio and text-to-music generation [6]. Its ability to perform audio-to-audio style transfer with text guidance is a valuable feature. The model is available in the Hugging Face Diffusers library, making it relatively easy to integrate.

## 3. Voice-to-Singing Conversion Models

This section focuses on models that can convert a user's speaking voice into a singing voice, a key feature for the proposed mobile app.

### 3.1. RVC (Retrieval-based Voice Conversion)

RVC is a highly popular and effective voice conversion framework that is particularly well-suited for singing voice conversion [7]. It uses a retrieval-based method to prevent timbre leakage, resulting in high-quality voice clones. With a low data requirement (around 10 minutes of audio) and fast training, RVC is a strong candidate for a mobile app. The real-time voice conversion capabilities, with latencies as low as 90ms, make it suitable for interactive applications. The MIT license is also a significant advantage for commercial use.

### 3.2. Amphion

Amphion is a comprehensive toolkit for audio, music, and speech generation, with strong support for singing voice conversion [8]. It includes several models, such as Vevo for zero-shot voice imitation and Noro for noise-robust voice conversion. The modular nature of Amphion makes it a powerful research tool, but it may require more effort to integrate into a mobile app compared to more specialized models like RVC.

### 3.3. Seed-VC

Seed-VC offers zero-shot voice and singing voice conversion with real-time capabilities [9]. It can clone a voice from a short audio sample (1-30 seconds) without any training. While the repository is archived, the code is still accessible and provides a strong foundation for a voice conversion feature.

### 3.4. So-VITS-SVC

So-VITS-SVC is another popular framework for singing voice conversion that has a large community and many forks [10]. However, it requires users to train their own models and the original repository has been archived. While it has proven to be effective, the need for individual model training might be a barrier for a seamless user experience in a mobile app.

## 4. Comparison of Models

| Model | Primary Use Case | Key Strengths | License | Mobile Suitability |
|---|---|---|---|---|
| **YuE (乐)** | Full-Song Generation | Lyrics-to-song, ICL, dual-track output | Apache 2.0 | High (but high resource demand) |
| **MusicGen** | Text-to-Music | High-quality audio, audio prompts | CC-BY-NC 4.0 | Medium (license is restrictive) |
| **Riffusion** | Real-time Music Generation | Spectrogram-based, real-time | CreativeML OpenRAIL M | Medium (indirect generation) |
| **AudioLDM 2** | Text-to-Audio/Music | Versatile, style transfer | Varies | High |
| **RVC** | Voice Conversion | High-quality singing SVC, low data, real-time | MIT | Very High |
| **Amphion** | Audio Generation Toolkit | Comprehensive, multiple models | Varies | Medium (requires more integration effort) |
| **Seed-VC** | Zero-shot Voice Conversion | Real-time, no training required | Open Source | High (archived, but code available) |
| **So-VITS-SVC** | Singing Voice Conversion | Popular, large community | Varies | Low (requires user model training) |

## 5. Recommendations

For the development of a mobile app similar to Suno, a combination of models would be the most effective approach.

*   **For Music Generation:** **YuE (乐)** is the most promising open-source model for full-song generation from lyrics. Its capabilities are the closest to Suno.ai, and its Apache 2.0 license is ideal for commercial use. However, its high computational requirements will necessitate a powerful backend infrastructure.

*   **For Voice-to-Singing Conversion:** **RVC (Retrieval-based Voice Conversion)** is the top recommendation. Its high-quality singing voice conversion, low data requirements, real-time capabilities, and permissive MIT license make it an excellent choice for a mobile app. It offers a user-friendly approach to voice cloning that would be highly engaging for users.

**Implementation Strategy:**

1.  **Backend:** Deploy **YuE** on a scalable cloud infrastructure to handle the demanding task of full-song generation. The mobile app would send lyrics and other parameters to the backend and receive the generated audio.

2.  **On-Device/Backend:** **RVC** could potentially be optimized for on-device inference for real-time voice conversion, which would provide the best user experience. Alternatively, it could be run on the backend with low latency to support real-time interaction.

By combining the power of YuE for song creation and RVC for personalized vocal performance, you can create a compelling and feature-rich mobile app that stands out in the growing field of AI-powered music generation.

## 6. References

[1] multimodal-art-projection. (2025). *YuE: Open Full-song Music Generation Foundation Model*. GitHub. Retrieved from https://github.com/multimodal-art-projection/YuE

[2] YuE Project. (2025). *YuE Demo Page*. Retrieved from https://map-yue.github.io/

[3] Facebook. (2023). *facebook/musicgen-large*. Hugging Face. Retrieved from https://huggingface.co/facebook/musicgen-large

[4] Copet, J., et al. (2023). *Simple and Controllable Music Generation*. arXiv:2306.05284.

[5] Riffusion. (2022). *riffusion/riffusion-model-v1*. Hugging Face. Retrieved from https://huggingface.co/riffusion/riffusion-model-v1

[6] Liu, H., et al. (2023). *AudioLDM: Text-to-Audio Generation with Latent Diffusion Models*. arXiv:2301.12502.

[7] RVC-Project. (2023). *Retrieval-based-Voice-Conversion-WebUI*. GitHub. Retrieved from https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI

[8] open-mmlab. (2023). *Amphion*. GitHub. Retrieved from https://github.com/open-mmlab/Amphion

[9] Plachtaa. (2023). *seed-vc*. GitHub. Retrieved from https://github.com/Plachtaa/seed-vc

[10] svc-develop-team. (2023). *so-vits-svc*. GitHub. Retrieved from https://github.com/svc-develop-team/so-vits-svc
