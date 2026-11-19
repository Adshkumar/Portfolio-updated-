---
title: "How LLMs Generate Text: Token Probabilities, Attention, and Decoding"
description: "Learn how a language model assigns probabilities to the next token, combines those predictions into a sequence, uses causal attention, and turns scores into generated text."
slug: "llm-token-probabilities-and-attention"
date: "2026-11-18"
updated: "2026-11-19"
tags:
  - Artificial Intelligence
  - Machine Learning
  - Transformers
  - Probability
category: "Architecture"
difficulty: "intermediate"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

An LLM does not usually write a complete sentence in one operation. It assigns scores to possible next tokens, turns those scores into probabilities, chooses a token, and repeats the process using the growing text as context.

This article follows that process from the probability of a whole sequence down to the attention calculation inside a Transformer. It builds on [How LLMs Really Work](/articles/how-llms-really-work), which covers tokenization, training, inference, and the surrounding AI application.

## First, think in tokens

A **token** is a unit in a model's vocabulary. It might be a word, part of a word, punctuation, or a special marker. For example, a tokenizer could split a phrase into tokens like:

```text
Text:   The cat sat.
Tokens: ["The", " cat", " sat", "."]
```

That is only an illustration; actual token boundaries depend on the tokenizer. A model predicts token IDs, and a tokenizer maps those IDs back to readable text.

When generating, the model has a current context: the prompt and any tokens it has already generated. It uses that context to estimate what token is likely to come next.

## A sentence is a chain of conditional probabilities

The formula in this section is easier to understand with a small example.

Imagine the model has generated the three-token sequence:

```text
The  cat  sat
  1    2    3
```

We want the probability of the complete sequence, not just the probability of the last token. The model calculates it in three steps:

```text
Step 1: P(The)
        "How likely is "The" as the first token?"

Step 2: P(cat | The)
        "Given that "The" came first, how likely is "cat" next?"

Step 3: P(sat | The, cat)
        "Given "The cat", how likely is "sat" next?"
```

Suppose those three probabilities are `0.03`, `0.40`, and `0.20` in an illustrative example. The probability of the exact sequence is:

```text
P(The cat sat)
  = P(The) × P(cat | The) × P(sat | The cat)
  = 0.03 × 0.40 × 0.20
  = 0.0024
```

The value `0.0024` means 0.24 percent **for this exact token sequence**, based on the illustrative probabilities. It is not the probability that the model's answer is factually correct.

The notation `P(a | b)` is read as “the probability of `a`, given `b`.” The vertical line means **we already know** `b`. For example:

```text
P(cat | The) = probability of "cat", given the context "The"
P(sat | The cat) = probability of "sat", given the context "The cat"
```

The sequence has more possible letters, words, and tokens than a human reader may notice. An exact sequence probability gets smaller as more tokens are included because one more conditional probability is multiplied into the result.

### What do `x`, `t`, `T`, and `∏` mean?

Longer sequences are written with symbols so the rule applies to any number of tokens:

```text
P(x[1], x[2], ..., x[T])
  = P(x[1])
    × P(x[2] | x[1])
    × P(x[3] | x[1], x[2])
    × ...
    × P(x[T] | x[1], ..., x[T-1])
```

This is the same chain rule as the `"The cat sat"` example. It means:

| Symbol | Meaning |
| --- | --- |
| `x[t]` | The token at position `t`. |
| `x[1]` | The first token. |
| `x[2]` | The second token. |
| `x[t-1]` | Every token before position `t`. |
| `T` | The total number of tokens in the sequence. |
| `×` | Multiply the next-token probabilities. |

For example, with `"The cat sat"`:

```text
T = 3
x[1] = "The"
x[2] = "cat"
x[3] = "sat"
```

Expanding the full formula produces exactly the three-step calculation above. The formula does not assume that each token is independent. Instead, every token can depend on all earlier tokens:

```text
P(sat | The cat)
```

already tells us that `"sat"` is being predicted with `"The cat"` as context.

### How does this formula change for a prompt and continuation?

A user prompt is the known context `c`. The model generates continuation tokens `y_1, y_2, ...` one at a time:

```text
P(y[1], y[2], ..., y[n] | c)
  = P(y[1] | c)
    × P(y[2] | c, y[1])
    × P(y[3] | c, y[1], y[2])
    × ...
    × P(y[n] | c, y[1], ..., y[n-1])
```

For example, suppose the prompt is:

```text
c = "The animal at my door is"
```

and the model generates:

```text
y[1] = " a"
y[2] = " cat"
```

The probability of that exact continuation is:

```text
P(" a cat" | "The animal at my door is")
  = P(" a" | "The animal at my door is")
    × P(" cat" | "The animal at my door is", " a")
```

The first term predicts `" a"` after the prompt. The second predicts `" cat"` after the prompt and `" a"` have both been observed. If those illustrative probabilities are `0.30` and `0.55`, the full continuation probability is:

```text
0.30 × 0.55 = 0.165
```

Again, `0.165` is only the probability of this exact two-token continuation under the illustrative model. It is not a confidence that the answer is true.

Each term has one concrete meaning:

```text
P(y[1] | c)             The first continuation token, given the prompt
P(y[2] | c, y[1])        The second token, given the prompt and first token
P(y[n] | c, y[1], ..., y[n-1])
                       The final token, given everything before it
```

A shorter symbolic form is:

```text
P(y[1], ..., y[n] | c)
  = P(y[1] | c)
    × P(y[2] | c, y[1])
    × ...
    × P(y[n] | c, y[1], ..., y[n-1])
```

The only difference from the first formula is that `c` adds the prompt to every condition.

## From scores to next-token probabilities

After processing the current context, the model produces one **logit** for every token in its vocabulary. A logit is a score, not a probability: it can be any real number and need not lie between 0 and 1.

The **softmax** function converts these scores into a probability distribution. For logits `z_i`, the probability assigned to vocabulary token `i` is:

```text
p_i = exp(z_i) / ∑_j exp(z_j)
```

The denominator sums over every token in the vocabulary. This makes each `p_i` non-negative and makes all the probabilities sum to 1.

For example, after the context `I poured coffee into the`, a model might assign probabilities like these:

| Candidate next token | Illustrative probability |
| --- | ---: |
| ` cup` | 0.42 |
| ` mug` | 0.25 |
| ` sink` | 0.12 |
| ` pot` | 0.08 |
| Other tokens combined | 0.13 |

These are illustrative values, not measurements from a particular model. The candidate is a **token**, not necessarily a complete word. The model's most probable token is ` cup`, but other tokens still have probability.

## How does attention use context?

Before it can predict the next token, a Transformer has to build a useful representation of the current context. **Self-attention** lets each token position combine information from other allowed positions.

At an attention layer, the model projects token representations into three vectors:

- **Query (`Q`)**: what information this position is looking for.
- **Key (`K`)**: what information each position offers for matching.
- **Value (`V`)**: the information that can be combined and passed onward.

A commonly used scaled dot-product attention equation is:

```text
Attention(Q, K, V) = softmax((QKᵀ + M) / √dₖ) V
```

Read it from left to right:

1. `QKᵀ` computes compatibility scores between queries and keys. A larger score means a stronger match according to the learned projections.
2. `M` is an optional mask. For a causal language model, it blocks positions that are not allowed to be seen.
3. Dividing by `√dₖ`, the square root of the key-vector size, keeps dot-product scores at a useful scale.
4. `softmax` turns each row of scores into weights that sum to 1.
5. Multiplying by `V` forms a weighted combination of value vectors.

The output is a new representation for each position. The process does not simply copy the most relevant word: the projections, weights, and resulting vectors are learned numerical operations.

### Why is the mask causal?

During next-token training, the model should not use the target token or any later token to predict the target at an earlier position. A **causal mask** makes future positions unavailable. One common convention adds `0` to allowed scores and negative infinity (`-∞`) to blocked scores before softmax:

```text
Allowed position:  score + 0
Blocked position:  score + (-∞)  -> probability 0 after softmax
```

For a sequence of four positions, the allowed attention pattern can be represented as:

```text
          keys the query may use
query     1   2   3   4
  1       ✓   -   -   -
  2       ✓   ✓   -   -
  3       ✓   ✓   ✓   -
  4       ✓   ✓   ✓   ✓
```

Position 3 can use positions 1, 2, and 3, but not position 4. At generation time, this matches the left-to-right process: a token can be based on the prompt and tokens already produced, not on tokens that have yet to be generated.

Transformers commonly use multiple **attention heads** in parallel, with different learned projections. An attention block is usually combined with residual connections, normalization, and a feed-forward network. Many such blocks are stacked before the model's final vocabulary scores are computed.

An attention weight is a component of this computation, not a complete explanation of why the model answered as it did. A large weight alone does not prove that one word caused an output or that the model has human-like understanding.

## How does the model choose a token?

The probability distribution does not by itself determine how text is generated. A **decoding strategy** turns it into a choice:

- **Greedy decoding** always chooses the highest-probability token. It is predictable, but can produce repetitive or less varied text.
- **Sampling** randomly draws a token according to the distribution. More likely tokens are more likely to be selected, but alternatives remain possible.
- **Top-p sampling** first keeps a set of likely tokens whose probabilities add up to a chosen threshold, then samples from that set.

Sampling often uses a **temperature** parameter `τ` to rescale logits before softmax:

```text
p_i = exp(z_i / τ) / ∑_j exp(z_j / τ)
```

Here `τ` is positive. At `τ = 1`, the logits are unchanged. Lower temperatures make the distribution more concentrated around higher-scoring tokens; higher temperatures make it more spread out. Temperature changes the sampling distribution, not the information the model has or the truth of an answer.

The decoding choice is separate from the model's learned parameters. The same model and context can produce different text under different decoding settings.

## Putting it together: one generation step

Suppose the prompt ends with:

```text
For breakfast, I toasted a slice of
```

A simplified generation step looks like this:

1. The tokenizer converts the prompt into token IDs.
2. The model turns those IDs into vectors and processes them through its Transformer layers.
3. Causal attention lets each position use only the permitted earlier context.
4. The final representation produces a logit for every vocabulary token.
5. Softmax converts the logits into next-token probabilities.
6. The decoding strategy selects a token, for example ` bread`.
7. The selected token is appended to the context, and the model repeats the process.

The next step might choose ` with`, then ` butter`, then a punctuation or end marker. The model does not choose all of those future tokens at once in ordinary autoregressive decoding. Each new choice is conditioned on the prompt and the tokens already selected.

Implementations often use a **KV cache** to retain keys and values for context tokens already processed. This avoids repeating some calculations at each generation step. The cache improves efficiency, but consumes memory that grows with the cached context and depends on model and implementation details.

## Training and generation are related, but not the same

During training, the model sees a text sequence and is asked to predict the next token at multiple positions. The training system compares each prediction with the token that actually appears in the training text.

For example, take this sequence:

```text
I love llamas
```

The model may create three prediction questions:

| Position | Text already shown | Correct next token |
| --- | --- | --- |
| 1 | Start / beginning marker | `I` |
| 2 | `I` | ` love` |
| 3 | `I love` | ` llamas` |

Suppose an illustrative model assigns these probabilities:

```text
P(I | start)           = 0.40
P(love | I)            = 0.25
P(llamas | I love)     = 0.10
```

Here, `P(llamas | I love)` means “how likely did the model say `llamas` was, after seeing `I love`?” The answer is `0.10` in this example.

For a prediction, the training loss for that position is:

```text
loss = -log(probability assigned to the correct token)
```

The negative logarithm turns probability into a penalty:

| Correct token probability | Negative log loss |
| --- | ---: |
| 0.40 | 0.916 |
| 0.25 | 1.386 |
| 0.10 | 2.303 |
| 0.01 | 4.605 |

A probability of `1.0` would give `-log(1.0) = 0`, so there is no prediction penalty. A very small probability gives a large penalty. The model is trying to reduce this penalty.

For the illustrative sequence above, the average loss is:

```text
(0.916 + 1.386 + 2.303) / 3 = 1.535
```

One position can use the wrong probability even when the rest of the sequence is correct. The average loss summarizes all prediction positions in the example or batch.

The general formula for a sequence is:

```text
L = -(1/N) × [log(P[θ](x[1]))
              + log(P[θ](x[2] | x[1]))
              + ...
              + log(P[θ](x[N] | x[1], ..., x[N-1]))]
```

Read it from left to right:

- `L` is the average training loss.
- `θ` represents all of the model's learned weights and other trainable parameters.
- `P[θ]` means “a probability produced by the model with parameters `θ`.”
- `x[t]` is the correct token at position `t`.
- `N` is the number of positions included in the training calculation.
- `log` is the logarithm. It makes the penalty grow when the model assigns too little probability to the correct token.
- `1/N` divides the total penalty by the number of positions, producing an average.

Changing `θ` changes the model's next-token probabilities. Training uses the loss to calculate how to change `θ`, then updates the parameters in the direction that reduces the loss on the training data.

This process is called **cross-entropy loss** for next-token prediction. It has a simple goal: make the probability of the tokens actually seen in training data as high as possible.

At inference time, the model uses its current parameters to make predictions; it does not normally update them in response to each prompt. Training teaches patterns from data, while decoding determines how a particular response is sampled or selected. Neither step guarantees that a fluent answer is factually correct.

## What these equations do—and do not—tell us

The equations describe useful parts of a language model:

- The chain rule explains how a sequence probability is built from conditional next-token probabilities.
- Softmax maps vocabulary logits to a normalized distribution.
- Attention combines information from allowed positions using learned queries, keys, and values.
- A decoding rule selects or samples the next token from the distribution.

They are not a complete description of every modern LLM. Architectures, position encodings, training objectives, tokenizers, post-training, and decoding systems vary. The equations also do not mean the model consciously reasons through the symbols as it responds; they are a compact mathematical description of computations performed by the network.

Most importantly, probability is not the same as truth. A model can assign high probability to a plausible continuation that is false, outdated, or unsupported. For important claims, check reliable sources rather than treating fluent output as verification.

## Key takeaways

- An LLM predicts tokens, which may be words, word pieces, punctuation, or special markers.
- The probability of a token sequence factors into conditional next-token probabilities; the tokens are not assumed to be independent.
- Softmax turns logits into probabilities, while greedy or sampling-based decoding chooses the next token.
- Causal attention lets a position combine information from permitted earlier positions, using learned query, key, and value projections.
- Generation repeats this prediction-and-selection loop until a stop condition is reached.
- These equations describe computation, not factual certainty or human-like understanding.

## References

- Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — introduces the Transformer and scaled dot-product attention.
- Brown et al., [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — studies autoregressive language models and their scaling behavior.
- Hugging Face, [Generation strategies](https://huggingface.co/docs/transformers/main/en/generation_strategies) — explains decoding approaches such as greedy search and sampling.
- Hugging Face, [Generation with LLMs](https://huggingface.co/docs/transformers/main/en/llm_tutorial) — describes token-by-token generation and caching in practice.
