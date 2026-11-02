---
title: "How LLMs Really Work: From Tokens to Text"
description: "Follow a language model from tokenization through Transformer attention, next-token prediction, training, and inference—and understand what it can and cannot know."
slug: "how-llms-really-work"
date: "2026-11-02"
tags:
  - Artificial Intelligence
  - Machine Learning
  - Transformers
  - Systems
category: "Architecture"
difficulty: "intermediate"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

A large language model (LLM) is a neural network trained to assign probabilities to sequences of tokens. A chat model uses that learned capability to generate a response one token at a time, conditioned on the conversation and any other information it receives.

That simple description hides several important steps. Text is first split into tokens, tokens become vectors, Transformer layers compute relationships between them, and a prediction head scores possible next tokens. Training adjusts the model's parameters; inference uses those learned parameters to produce an answer. The model does not look up a sentence in a hidden database every time it replies.

![A text prompt is tokenized, processed through Transformer layers, converted to next-token scores, and decoded one token at a time; model training adjusts the parameters separately](/articles/images/llm-generation-pipeline.svg "From a text prompt to generated tokens")

Figure 1: At inference time, a model repeatedly predicts a distribution over its vocabulary and chooses a next token. Training is a separate process that adjusts parameters using examples. The diagram shows a common decoder-only Transformer pattern, not every language model architecture.

## Begin with a concrete example

Suppose the prompt is:

```text
The tallest mountain above sea level is
```

The model does not directly search the web or retrieve a fact by default. It converts the prompt into tokens, processes them, and scores candidate next tokens. The distribution might assign a high score to `Mount`, followed by ` Everest`, while assigning lower scores to other continuations. The exact tokens depend on the tokenizer; words do not always correspond to one token.

After selecting a token, the model appends it to the input and predicts again. It might produce `Mount` first and ` Everest` next, then continue with punctuation or an explanation. The answer is built incrementally, not generated all at once.

## 1. Text becomes tokens and vectors

### Tokenization: splitting text into model-sized pieces

A **tokenizer** maps text to token IDs from a fixed vocabulary. A token may be a whole common word, part of a word, punctuation, whitespace, or a special control marker. For example, an uncommon name may be split into several pieces, while a common short word may use one token.

Token IDs are integers, not meaningful measurements. The model looks up a learned **embedding vector** for each ID: a list of numbers that gives the neural network a representation to process. Models may also add positional information so the network can distinguish token order. The exact tokenization and position method vary by model family.

This is why token count is not the same as word count. It also explains why context limits, usage costs, and latency are often measured in tokens rather than characters or words.

## 2. Transformer layers build context

Many current text-generation models use a **decoder-only Transformer**. Its layers transform the token vectors while allowing each position to use information from earlier positions in the sequence.

### Self-attention: choosing which earlier tokens matter

At each layer, **self-attention** computes how strongly tokens should relate to one another. A simplified form is:

```text
Attention(Q, K, V) = softmax((QKᵀ / √dₖ) + causal_mask) V
```

Here, the network projects token representations into **queries** (`Q`), **keys** (`K`), and **values** (`V`). Query-key scores represent relevance; the softmax converts scores into weights; and the weighted values carry information forward. Multiple attention heads can learn different patterns in parallel.

For next-token generation, a **causal mask** prevents a position from using future tokens that would not be available when generating left to right. Attention is not a human-style search for meaning. It is a learned computation over representations, and a high attention weight alone does not establish that a token caused or explains a decision.

### The rest of a Transformer layer

Attention is only part of the computation. A typical Transformer block also has residual connections, normalization, and a feed-forward network that transforms each position's representation. A model stacks many such blocks. Their repeated computations can represent patterns involving syntax, facts, instructions, and other features of the training data.

The model's parameters—often called its **weights**—are numerical values learned during training. They are not a clean table of facts, and interpreting a particular output by inspecting a few weights is generally not straightforward.

## 3. The model scores possible next tokens

After the final Transformer layer, a projection maps the current representation to one score, or **logit**, for each token in the model's vocabulary. A softmax can turn these scores into a probability distribution:

```text
logits -> softmax -> scores over vocabulary -> choose a token
```

The highest-scoring token is not always selected. A decoder may choose the maximum-probability token (greedy decoding), sample from the distribution, or use another strategy. **Temperature** changes how concentrated the distribution is before sampling; **top-p** sampling limits sampling to a set of likely tokens. These settings affect output variation, not whether the model has verified a claim.

Once selected, the token is appended to the sequence and the model predicts the next one. Generation stops at a configured limit or a stop condition such as an end-of-turn token. This repeated prediction is called **autoregressive generation**.

## How is a language model trained?

### Pretraining: learn to predict text

In a common pretraining setup, the model receives sequences with some tokens hidden from its prediction target by position: it uses the preceding context to predict the next token. During training, the known next token is the target. A loss function measures how poorly the model scored that target, and an optimization algorithm adjusts the weights to reduce the loss across many training examples.

For example:

```text
Input:  The tallest mountain above sea level is
Target: Mount
```

The training objective rewards assigning a higher probability to the observed next token. Repeating this process over large datasets teaches statistical patterns of language and information present in the data. It does **not** guarantee that every fact is retained, current, or reliably retrievable.

This is a common objective for decoder-only LLMs, not a universal description of every language model. Some models use other architectures, objectives, data mixtures, or training stages.

### Post-training: shape useful behavior

A pretrained model can continue text without reliably following conversational instructions. Many chat models therefore receive additional training. A common approach uses supervised examples of prompts and desired responses, followed by preference training based on comparisons or feedback. Methods differ: reinforcement learning from human feedback (RLHF) is one approach; direct preference optimization (DPO) is another. Not every deployed model uses the same pipeline.

Post-training can make a model more helpful, structured, or consistent with a product's behavior goals. It does not turn the model into a database, ensure factual accuracy, or remove all biases and failure modes.

## What happens during inference?

**Inference** is the process of using a trained model to produce output. A typical text-generation request follows this path:

1. The application assembles the prompt, which may contain system instructions, conversation history, retrieved documents, or tool results.
2. The tokenizer converts the input into token IDs, and the model processes those tokens.
3. The model scores possible next tokens; the decoding strategy selects one.
4. The selected token is appended to the sequence, and the process repeats until a stop condition or output limit.
5. The tokenizer converts generated token IDs back into text for the application.

For efficiency, many implementations cache intermediate attention values for tokens already processed. This **KV cache** avoids recomputing all prior key and value projections for each newly generated token. It reduces repeated computation, but uses memory that generally grows with the cached sequence length and model configuration.

The initial processing of the prompt is often called **prefill**; producing each new token is the **decode** phase. Long prompts increase prefill work, while long outputs require repeated decode steps. Actual latency and memory use depend on model size, hardware, precision, batching, context length, and implementation.

## Why can an LLM sound confident and still be wrong?

The next-token objective trains the model to produce likely continuations, not to check every statement against a current source. A fluent response can therefore contain a fabricated citation, a mistaken detail, or an answer that is plausible in wording but incorrect in substance. This behavior is often called a **hallucination**.

Several practical implications follow:

- Model parameters reflect patterns learned during training; they are not a guaranteed, up-to-date fact store.
- A conversation can condition the response, but providing a prompt does not normally update the model's weights.
- A model cannot access live websites or private systems unless the application supplies that information or connects tools.
- Retrieval-augmented generation can give the model relevant source material, but the system still needs source quality checks and should verify that claims are supported.
- A low temperature may make output more repeatable, but it does not make an answer true.

Treat generated content according to its risk. For a low-stakes draft, a quick review may be enough. For medical, legal, financial, security, or production decisions, verify important claims against reliable sources and use appropriate expert review.

## The model is not the whole AI application

A user-facing assistant often includes more than a language model:

```text
User -> application instructions and context -> model
                                      -> optional tools or retrieval
                         <- response and application checks
```

The surrounding application may select a model, manage conversation history, retrieve documents, call tools, validate structured output, apply safety policies, and log or filter results. Tool use is an application/model interaction: the model may request an action, but the application executes the tool and returns its result. A model generating text that looks like a tool call is not, on its own, evidence that the action occurred.

This distinction matters when debugging. A poor answer could come from the model, missing or misleading context, retrieval, tool execution, prompt construction, decoding settings, or application logic. Inspect the complete path rather than assuming every behavior comes from the model weights.

## Key takeaways

- An LLM processes token IDs and predicts a probability distribution for the next token; it generates output through repeated prediction.
- Transformer attention mixes information from the available context, while other parts of each layer further transform the representations.
- Pretraining commonly teaches next-token prediction; post-training can shape instruction-following and preferences, but neither guarantees truth.
- Inference is iterative. Caching prior attention values can reduce repeated work, with memory and latency trade-offs.
- A chat product may add prompts, retrieval, tools, and checks around the model. Those components are part of the system, not properties of the model alone.
- Fluency is not verification. Check important claims against trustworthy sources.

## References

- Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — introduces the Transformer architecture.
- Brown et al., [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — studies large autoregressive language models and in-context examples.
- Ouyang et al., [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — describes one instruction-tuning and RLHF approach.
- Hugging Face, [Generation strategies](https://huggingface.co/docs/transformers/main/en/generation_strategies) — explains decoding choices such as greedy search and sampling.
- OpenAI, [Text generation](https://developers.openai.com/api/docs/guides/text) — illustrates text-generation requests in a deployed API.
