# Google Live Translation 替换 Soittaa 翻译系统分析

## 一、现有系统背景

Soittaa（芬兰语"打电话"）是一套实时通话翻译系统，采用经典的级联管道架构：

```
说话人 A → [STT] → [翻译] → [TTS] → 说话人 B
说话人 B → [STT] → [翻译] → [TTS] → 说话人 A
```

---

## 二、Google 可用的替换方案

### 方案 A：Cloud Media Translation API（推荐用于快速迁移）

Google 的一体化流式语音翻译服务，内置 STT + 翻译，单流计费。

| 项目 | 定价 |
|------|------|
| 流式音频翻译 | **$0.068 / 分钟**（每路音频流） |

**双向通话总成本：**
- 2 路音频流（A→B，B→A）：$0.068 × 2 = **$0.136 / 通话分钟**
- 还需叠加 TTS 费用（见下）

### 方案 B：级联管道（可控性更高）

分拆为三个独立 API，可单独调优和替换：

#### 1. Cloud Speech-to-Text（STT）

| 模型 | 定价 |
|------|------|
| Chirp 标准（实时） | $0.016 / 分钟 |
| Chirp 增强（高精度） | $0.024 / 分钟 |
| 批量处理 | $0.004 / 分钟 |
| 免费额度 | 60 分钟 / 月 |

#### 2. Cloud Translation API（文本翻译）

| 类型 | 定价 |
|------|------|
| NMT 标准（v2/v3） | $20 / 百万字符 |
| Translation LLM | $10/M 输入 + $10/M 输出 |
| Adaptive Translation | $25/M 输入 + $25/M 输出 |
| 免费额度 | 50 万字符 / 月 |

> 语速估算：150 词/分钟 × 平均 5 字符/词 = **~750 字符/分钟**

#### 3. Cloud Text-to-Speech（TTS）

| 声音类型 | 定价 |
|----------|------|
| 标准声音 | $4 / 百万字符 |
| WaveNet / Neural2 | $16 / 百万字符 |
| Chirp 3 HD | $30 / 百万字符 |
| 免费额度 | 标准声音 400 万字符 / 月 |

---

## 三、成本估算

### 单次通话成本对比（双向，每分钟）

| 方案 | STT | 翻译 | TTS | **合计/分钟** |
|------|-----|------|-----|--------------|
| 方案 A（Media Translation + Chirp TTS） | 已含 $0.136 | 已含 | $0.023 | **~$0.16** |
| 方案 B 标准（Chirp 标准 + NMT + Chirp HD TTS） | $0.032 | $0.030 | $0.045 | **~$0.11** |
| 方案 B 精简（Chirp 标准 + NMT + 标准 TTS） | $0.032 | $0.030 | $0.006 | **~$0.07** |

> 翻译字符估算：750 字符/分钟/路 × 2 路 = 1500 字符/分钟，$20/M × 0.0015 = $0.030

### 月度规模成本估算

以下按 **平均通话时长 10 分钟、每天 100 通电话** 估算：

| 月通话量 | 方案 A | 方案 B 标准 | 方案 B 精简 |
|----------|--------|-------------|-------------|
| 3000 通（100/天） | **$4,800** | **$3,300** | **$2,100** |
| 10,000 通 | **$16,000** | **$11,000** | **$7,000** |
| 50,000 通 | **$80,000** | **$55,000** | **$35,000** |

> 注：已扣除免费额度，大规模使用需联系 Google 谈企业折扣。

---

## 四、延迟特性

| 架构 | 端到端延迟 |
|------|-----------|
| 端到端 S2ST 模型 | 400–700 ms |
| 级联管道（方案 B） | **1–2 秒**（典型值） |
| Media Translation API | ~800 ms–1.5 秒 |

> 电话音频环境下语音识别错误率约为 16.9%，需针对电话噪声做专项优化。

---

## 五、迁移实施步骤

### 步骤 1：Google Cloud 环境准备

```bash
# 创建/选择 GCP 项目
gcloud projects create soittaa-translation --name="Soittaa Translation"
gcloud config set project soittaa-translation

# 启用所需 API
gcloud services enable speech.googleapis.com
gcloud services enable translate.googleapis.com
gcloud services enable texttospeech.googleapis.com
# 如选方案 A：
gcloud services enable mediatranslation.googleapis.com

# 创建服务账号并下载密钥
gcloud iam service-accounts create translation-sa \
    --display-name="Translation Service Account"
gcloud iam service-accounts keys create ./credentials.json \
    --iam-account=translation-sa@soittaa-translation.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding soittaa-translation \
    --member="serviceAccount:translation-sa@soittaa-translation.iam.gserviceaccount.com" \
    --role="roles/cloudtranslate.user"
```

### 步骤 2：方案 A — Media Translation API 集成（Python 示例）

```python
from google.cloud.mediatranslation_v1beta1 import SpeechTranslationServiceClient
from google.cloud.mediatranslation_v1beta1.types import (
    StreamingTranslateSpeechConfig,
    TranslateSpeechConfig,
    StreamingTranslateSpeechRequest,
)

def stream_translation(audio_generator, source_lang="fi-FI", target_lang="zh"):
    client = SpeechTranslationServiceClient()

    speech_config = TranslateSpeechConfig(
        audio_encoding="linear16",
        source_language_code=source_lang,
        target_language_code=target_lang,
        sample_rate_hertz=16000,
    )
    config = StreamingTranslateSpeechConfig(
        audio_config=speech_config,
        single_utterance=False,
    )

    def request_generator():
        yield StreamingTranslateSpeechRequest(streaming_config=config)
        for chunk in audio_generator:
            yield StreamingTranslateSpeechRequest(audio_content=chunk)

    responses = client.streaming_translate_speech(request_generator())
    for response in responses:
        result = response.result
        if result.text_translation_result.is_final:
            yield result.text_translation_result.translation
```

### 步骤 3：方案 B — 级联管道集成（Python 示例）

```python
from google.cloud import speech, translate_v2, texttospeech

# --- STT：语音转文字 ---
def transcribe_stream(audio_generator, language_code="fi-FI"):
    client = speech.SpeechClient()
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code=language_code,
        model="telephony",          # 专为电话音频优化
        use_enhanced=True,
    )
    streaming_config = speech.StreamingRecognitionConfig(
        config=config, interim_results=True
    )

    def stream():
        for chunk in audio_generator:
            yield speech.StreamingRecognizeRequest(audio_content=chunk)

    for response in client.streaming_recognize(streaming_config, stream()):
        for result in response.results:
            if result.is_final:
                yield result.alternatives[0].transcript

# --- 翻译：文字翻译 ---
def translate_text(text, target_lang="zh"):
    client = translate_v2.Client()
    result = client.translate(text, target_language=target_lang)
    return result["translatedText"]

# --- TTS：文字转语音 ---
def synthesize_speech(text, language_code="zh-CN"):
    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=language_code,
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16
    )
    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    return response.audio_content

# --- 完整管道 ---
def translation_pipeline(audio_chunk, source_lang, target_lang):
    for transcript in transcribe_stream([audio_chunk], source_lang):
        translated = translate_text(transcript, target_lang)
        audio_out = synthesize_speech(translated, target_lang + "-XX")
        return audio_out
```

### 步骤 4：电话集成（Twilio 示例）

```python
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream

def create_translation_stream(call_sid, websocket_url):
    response = VoiceResponse()
    connect = Connect()
    stream = Stream(url=websocket_url)
    stream.parameter(name="source_lang", value="fi-FI")
    stream.parameter(name="target_lang", value="zh")
    connect.append(stream)
    response.append(connect)
    return str(response)
```

### 步骤 5：配置与监控

```yaml
# config.yaml
google_translation:
  project_id: "soittaa-translation"
  credentials_path: "./credentials.json"
  
  # 方案选择：media_translation 或 cascaded
  mode: "cascaded"
  
  stt:
    model: "telephony"           # 电话专用模型
    use_enhanced: true
    language_pairs:
      - source: "fi-FI"
        target: "zh"
      - source: "zh"
        target: "fi-FI"
  
  translation:
    model: "nmt"                 # neural machine translation
  
  tts:
    voice_type: "neural2"        # standard / wavenet / neural2 / chirp3-hd
    
  cost_alert:
    monthly_budget_usd: 5000
    alert_threshold: 0.8         # 80% 时告警
```

---

## 六、方案选型建议

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 快速迁移、少于 10,000 通/月 | **方案 A** | 集成简单，API 少 |
| 高质量、精细控制、大规模 | **方案 B 标准** | 可独立升级每个环节 |
| 成本优先、质量要求一般 | **方案 B 精简** | 最低成本 |
| 超大规模（>50 万分钟/月） | **联系 Google 谈企业协议** | 有显著折扣 |

---

## 七、迁移风险提示

1. **延迟增加**：级联管道延迟 1-2 秒，需在 UI 上做缓冲提示
2. **电话音质**：电话噪声会提升 STT 错误率，建议使用 `telephony` 模型
3. **字符计费陷阱**：TTS 按字符计费，长句中文字符数与英文差异大，需预估
4. **冷启动**：Streaming API 首次连接有 ~200ms 握手延迟
5. **配额限制**：默认并发流数有上限，大规模部署需提前申请配额提升

---

## 参考资料

- [Cloud Translation 定价](https://cloud.google.com/translate/pricing)
- [Speech-to-Text 定价](https://cloud.google.com/speech-to-text/pricing)
- [Text-to-Speech 定价](https://www.xpay.sh/saas-pricing/google-cloud-text-to-speech/)
- [Media Translation API](https://sourceforge.net/software/product/Google-Cloud-Media-Translation-API/)
- [实时语音翻译架构指南](https://deepgram.com/learn/real-time-speech-to-speech-translation)
