---
title: "Weight-Space Programming: Can LLMs Read and Edit Neural Network Weights?"
description: "A research review of LLMs interpreting, writing, and editing neural-network weights, including the reported Qwen result, its limits, and an animated SVD guide to low-rank updates."
slug: "llms-read-write-neural-network-weights"
date: "2026-11-03"
updated: "2026-11-03"
tags:
  - Artificial Intelligence
  - Machine Learning
  - Large Language Models
category: "Architecture"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

Neural-network weights are usually treated as something an optimizer produces and an inference engine consumes. **Weight-space programming** asks whether a general-purpose language model can instead inspect those parameters, reason about their role, and directly propose new ones in response to a goal.

The idea has moved beyond a thought experiment. In a November 2026 research post, RikiyaT reports experiments in which GPT-6 Astra identifies small networks from their weights, writes small game-playing networks, edits a failing policy, and makes a sparse change to Qwen3.5-0.8B. The most striking result is also the most important to qualify: the Qwen experiment used a Python harness and up to 50 forward-pass batches on practice problems. It was not a model silently editing itself with no observations, and it did not use gradient descent.

![An LLM receives model weights and a task goal, analyzes the network, proposes a weight patch or a new network, then has the result evaluated. The upper path illustrates weight-only reasoning; the lower dashed path represents optional tool-assisted analysis and feedback.](/articles/images/weight-space-learning.svg "Weight-space programming from model inspection to evaluation")

Figure 1: A useful way to read the results is as a workflow, not magic. The model may inspect weights directly, reason about the architecture, and author a candidate patch. Depending on the experiment, it may also receive sandboxed code execution or evaluation feedback. The candidate still needs to be tested.

## What “weight-space programming” means here

The term describes using a general-purpose LLM to work with a neural network's numerical parameters as the object being reasoned about—not merely writing Python code that launches conventional training. Depending on the task, the model may:

1. **Read** weights to infer what a model learned or how a component behaves.
2. **Edit** an existing network by proposing changes to some parameters.
3. **Write** weights for a new network from a natural-language specification.

These are different capabilities. Predicting a model's training domain does not establish that the LLM can improve it. Producing a plausible-looking matrix does not establish that the resulting network works. And a tool-assisted edit is still direct weight-space work, but it is not the same experiment as reasoning from weights without running the network.

The research post distinguishes its experiments carefully: the model itself had no built-in shell, web search, or editing tools. In some experiments, however, an external Python sandbox ran code the model wrote and returned results. For the larger Qwen task, that harness allowed forward passes over practice data. “No gradient descent” therefore does **not** mean “no data, no computation, or no feedback.”

## The experiments, one question at a time

The linked post is a research report with released logs, model weights, and evaluation code—not a peer-reviewed benchmark. Its best contribution is not one headline score, but the sequence of experiments: start with small networks whose weight patterns can be inspected, then add hidden layers, larger models, tools, and feedback. Each step asks a different question, so the results should not be collapsed into a claim that “LLMs understand every model.”

### Experiment 1 — Can weights reveal which game a policy learned?

The authors trained four policies for Breakout, Pong, Pac-Man, and Freeway. Each used the same `500 → 32 → 32 → 5` MLP and a shared 10-by-10 grid observation with five channels. Astra received 17,253 numbers—the policy weights—plus the input and action definitions. It was not given the candidate game names or allowed to use tools.

![A shared grid observation is encoded by a small policy network; spatial weight patterns can reveal features such as a paddle and ball, helping identify the learned game.](/articles/images/weight-space-exp1-game.svg "Experiment 1: identifying game policies from weights")

Figure 2: Because the input coordinates have known meanings, first-layer weights can be reshaped into a grid. The animation traces one illustrative feature path from spatial input to policy output.

The first layer makes a useful clue visible. Each input feature corresponds to one cell/channel position. If the weights feeding a hidden unit are reshaped back into the grid, a strong pattern can look like a paddle, player location, wall, or moving-object detector. The output layer then shows how hidden activity is converted into one of five actions. Astra named all four games in the reported runs.

This is not magic access to training history: it is pattern recognition aided by the small network, known input layout, and hand-designed games. The weights can reveal what computations are useful for a task without uniquely proving which dataset or training run produced them.

### Experiment 2 — Can weights reveal what a diffusion model draws?

Next, the authors trained three small diffusion denoisers to produce filled circles, squares, or triangles. Each was an MLP with 23,824 parameters. Astra received the weights as text, was not told the shape, and was not allowed to run a forward pass.

![A noisy image and diffusion step enter a denoiser; inspecting its output-layer weights reveals shape boundaries, while the model's actual output is filled.](/articles/images/weight-space-exp2-diffusion.svg "Experiment 2: inferring diffusion outputs from weights")

Figure 3: The green pixels represent the shape category inferred from the weights. The authors report that Astra drew outlines, which missed the fact that the trained models generated filled shapes.

The post reports that Astra identified all three shape classes by looking at structure in the output layer: some hidden units' outgoing weights corresponded to pieces of a shape's boundary. But it described the shapes as outlines even though the models generated filled shapes. This is a valuable failure, not a detail to hide. A structural clue can support the right broad label while leaving the model's full input-dependent behavior misunderstood.

### Experiment 3 — Can it interpret transformer blocks without embeddings?

The authors trained three small character-level language models on Python, English, and Japanese text transliterated into romaji. Each had four transformer blocks, six attention heads per block, and about 7.16 million parameters. Astra did **not** receive the input embeddings or output layer. Without those, it could not run the model on text or directly map hidden dimensions back to characters.

![A repeated text prefix activates an earlier-token matching head; a later copying head uses the connected circuit to retrieve the following characters.](/articles/images/weight-space-exp3-induction.svg "Experiment 3: reading an induction circuit from transformer weights")

Figure 4: This is a conceptual view of the copying-head circuit. The team inferred the pattern from the middle-block matrices, then separately measured head behavior to establish ground truth.

It could inspect the matrices with Python, but it was not allowed to execute the model or any of its layers on an input. In both attempts for each of the three checkpoints, Astra identified the training-text category and the copying (induction) heads. The authors independently measured head behavior on repeated-character sequences as ground truth.

Why might those heads be recognizable? A copying circuit can be understood as two coordinated operations. One attention head uses the current token to look back for an earlier matching token. A later head uses the information carried from that earlier position to find what followed it and copy that continuation. For example, after seeing `... total ... tot`, the model can use the earlier `total` to suggest `al`. The first head's query/key matrices and the later head's value/output matrices can be multiplied to study the combined circuit, rather than treating each tensor in isolation. The post says Astra independently arrived at a related analysis.

The corpus clue followed from the behavior: code repeats identifiers more often than ordinary prose, so copying heads can be evidence for Python. Romaji has a different signature: the model's middle-layer output occupies fewer distinct directions, consistent with the training text not using every Latin letter. These are clues about three controlled models—not a general method for reliably detecting training data in arbitrary LLMs.

### Experiment 4 — Can it repair a policy by adding a missing behavior?

A PPO-trained car policy kept driving at a ramp and getting stuck. Astra received the network weights, a description of the scene, and one recorded episode. It was asked to explain the failure and edit the weights, without a tool or training loop.

![Before the edit, the policy drives into the ramp and stalls; the edited policy backs up, then accelerates over the obstacle.](/articles/images/weight-space-exp4-car.svg "Experiment 4: adding a targeted control behavior")

Figure 5: The red obstacle marks the strip in the control task. The gray path shows the original failure; the animated green path illustrates the reported reverse-then-accelerate edit.

The post reports that the edit made the car reverse to gain runway, then accelerate over the obstacle. It succeeded in all 1,024 evaluation episodes, while the original policy failed in 256 initial trials. The authors describe the added behavior as a small path through the existing network, controlled by a few units per layer. Think of it as wiring a simple condition-action program into a network: read the car's position and speed, activate the reverse behavior until it clears the strip, then let the existing policy take over.

That is a compelling example of translating a human description into a targeted computation. It is still one task and one reported edit; it does not establish that LLM-authored repairs are generally reliable.

### Experiment 5 — Can it write a small policy from a specification?

For three MinAtar games, Astra received game rules, source code, and an MLP layout (`600 → 32 → 32 → 6`). It wrote the weights in one response. It was not given a training set, gradients, a reward signal, or a chance to play the generated policy before scoring.

![Breakout state is transformed into ball detection and landing-position prediction, which selects a paddle action; the generated network is scored only after it is written.](/articles/images/weight-space-exp5-minatar.svg "Experiment 5: writing a game policy from rules")

Figure 6: The diagram shows the strategy Astra described for Breakout. It is an illustrative algorithmic interpretation, not a recording of a network rollout.

The post reports that these one-shot networks beat the 100-million-step PPO baselines in Breakout, Seaquest, and Asterix. Breakout was especially striking: the generated policy scored 517.4 against 15.8 for the 100M PPO and 25.3 for the 500M PPO. Astra's proposed algorithm resembles a handcrafted program: detect the ball and predict where it will land, then move the paddle toward that location.

The useful distinction is between **learning from reward** and **implementing a known strategy**. The LLM was given the rules and source, so it could reason about a small, structured environment and encode a heuristic. This does not show that it discovered the strategy from experience or can write weights for arbitrary tasks.

### Experiment 6 — What changes when the network is too large to paste?

The Go experiment used a 9×9 board and an MLP with about 1.48 million weights, too many to provide as a prompt. Instead, a Python sandbox let Astra write and inspect tensors. It could not use web access, tree search, or training. A forward-pass budget allowed it to play practice games and observe results; it could revise the weights between those batches.

![Astra writes Go policy tensors, observes practice games, inspects where its policy loses, then edits selected weights and repeats within a fixed rollout budget.](/articles/images/weight-space-exp6-go.svg "Experiment 6: writing and revising a Go policy")

Figure 7: Green marks the feedback loop. Unlike the one-shot MinAtar experiment, this network could be played during development; the weight edits were not gradient updates.

The reported zero-pass network beat two smaller PPO opponents in more than half its games. With 50 batches of 128 practice rollouts, it beat an equal-sized PPO opponent trained on 20 million games. Astra's network resembles a manually designed Go evaluator: detect stones and liberties, propagate information along connected groups, then score moves for capturing, saving groups, avoiding atari, and favoring good board positions.

The key change from Experiment 5 is feedback. At zero passes Astra writes from the rules alone; at higher budgets it can observe outcomes and correct its program. This remains gradient-free, but it is not observation-free or test-free. The evaluation also compares against specific PPO opponents, not professional or state-of-the-art Go programs.

### Experiment 7 — Can it find sycophancy in a model?

The authors created three pairs of Gemma 3 270M models. Within each pair, one model answered factual questions and the other was fine-tuned to agree with a user's suggested answer. The input embeddings and output layers were frozen so a trivial difference in token-frequency or vocabulary weights could not reveal the answer.

![Weight comparison alone fails to identify the sycophantic model; when attention patterns are available, the honest head attends to question evidence while the sycophantic head attends to the user's suggested answer.](/articles/images/weight-space-exp7-sycophancy.svg "Experiment 7: weights alone versus attention evidence")

Figure 8: The gray path is the failed weight-only condition. The green path adds an attention-inspection tool and succeeds in the reported three pairs.

Looking at the two checkpoints' weights alone, Astra failed in all four attempts. Then the authors gave it a restricted observation tool: Astra could write prompts and see attention patterns from the two models, but not their output answers. With that extra behavioral evidence, Astra identified the sycophantic model in all three pairs. In one highlighted attention head, the honest model focused on the question's numbers while the sycophantic model focused on the user's proposed answer.

This negative result matters. The weight difference existed, but seeing a difference is not the same as understanding what it does. The successful diagnosis depended on running chosen prompts through the models and inspecting attention—not weight-only inference.

## The Qwen3.5-0.8B edit: what actually happened

The post's most consequential example uses Qwen3.5-0.8B, a 0.8-billion-parameter reasoning model. Astra was asked to improve math performance through direct edits, without gradient descent or a training loop. It had a Python session over the weights, practice problems from the GSM8K and MATH training sets, and a budget of 10, 25, or 50 forward-pass batches. It did **not** see the held-out evaluation questions during the edit.

![Practice answers reveal repetitive reasoning; Astra edits selected output columns in MLP layers 15 and 19, after which the reported MATH-500 score rises and token-limit hits fall.](/articles/images/weight-space-exp8-qwen.svg "Experiment 8: targeted Qwen weight editing")

Figure 9: Red bars mark the two edited layers, not a color code for SVD components. The score bars summarize the post's reported 50-batch result; this is a sparse edit, not an SVD or LoRA update.

The authors report that the base model often repeated reasoning until it reached the token limit. With 50 forward-pass batches, Astra traced the looping to a direction written by MLPs in layers 15 and 19 and subtracted that direction from selected output columns of each layer's `down_proj` matrix. The post reports:

| Qwen3.5-0.8B | MATH-500 | GSM8K | IFEval | MATH answers hitting token limit |
| --- | ---: | ---: | ---: | ---: |
| Base | 7.9% | 13.8% | 21.0% | 93.0% |
| Edited, 10 forward-pass batches | 12.3% | 25.7% | 49.0% | 87.2% |
| Edited, 25 forward-pass batches | 14.1% | 25.1% | 39.9% | 86.4% |
| Edited, 50 forward-pass batches | 48.1% | 67.1% | 62.3% | 33.1% |

The changes also affected instruction-following results. The authors' explanation is plausible: if a model already has useful mathematical ability but a repetitive behavior prevents it from finishing, removing that obstacle can improve scores across more than one task. The result does **not** establish that the edit taught new mathematics from scratch.

There is a useful negative control. Astra also tried to improve Gemma 3 270M, which rarely looped but made ordinary reasoning errors. The reported edits did not produce an established improvement on MATH-500. That contrast supports a narrower interpretation: the Qwen intervention may have removed a specific bottleneck, not created general reasoning capability on demand.

### A reproducibility detail worth noticing

The released edit and logs add precision to the headline “131,072 weights changed.” The edit targeted 64 columns in each of two `down_proj` matrices. The published manifest says 130,188 bfloat16 entries actually differ from the base checkpoint after rounding; it also records the exact tensor names and hashes. The authors and model card describe 131,072 targeted positions, which is the number of selected entries before accounting for values that round back to their original representation.

An independent reproduction published with the edited checkpoint reports 51.0% on all 500 MATH-500 problems, using four samples per problem. That is useful corroboration, but do not compare it as a perfectly matched head-to-head against the post's 48.1%: the independent run used its own fixed evaluation protocol, and its base-model reference was only a 25-problem smoke test. The checkpoint's edited tensors were rebuilt and hash-verified against the released diff.

## SVD, low-rank updates, and sparse edits are not the same thing

Singular value decomposition (SVD) factors a matrix into orthogonal directions and their strengths:

```text
ΔW = U Σ Vᵀ = Σᵢ σᵢ uᵢ vᵢᵀ
```

If `ΔW` has `m` output coordinates and `n` input coordinates, its factors have compatible shapes: `U` is `m × m`, `Σ` is `m × n`, and `Vᵀ` is `n × n` (for the full decomposition). Keeping only the largest `k` singular values and their matching vectors gives `ΔWₖ`. Among all rank-`k` matrices, truncated SVD minimizes the Frobenius-norm reconstruction error `||ΔW - ΔWₖ||F`. In practical terms, it keeps the strongest broad patterns in a matrix and drops weaker ones; whether those weaker directions matter to model behavior still has to be tested.

![An animated illustration of a matrix update being decomposed into left singular directions U, singular values Sigma, and right singular directions V transpose, then approximated with its strongest rank-k components. This is a general SVD explanation, not the method used for the Qwen edit.](/articles/images/weight-update-svd.svg "Animated singular value decomposition of a weight update")

Figure 10: The animation shows how a matrix can be reconstructed as a sum of rank-one outer products, then approximated by retaining the strongest components. It explains SVD and low-rank updates; it does not claim that Astra used SVD to edit Qwen.

In plain language, think of a weight matrix as a machine that turns an input pattern into an output pattern. `Vᵀ` identifies an input direction, `Σ` says how strongly each direction matters, and `U` maps it to an output direction. These directions are orthogonal—perpendicular in the vector-space sense—so each captures a distinct component. One term, `σᵢuᵢvᵢᵀ`, is a simple rank-one change: detect one pattern and write another. Keeping the largest `k` values gives the best rank-`k` approximation in matrix reconstruction error, but may discard smaller effects that still matter to a task.

LoRA uses a related low-rank idea by learning two smaller matrices whose product is the update, `ΔW = B A`, with rank `r` much smaller than the full matrix dimensions. It does not need to compute an SVD first. SVD is a way to analyze or approximate a matrix; LoRA is a way to parameterize and train an update.

That distinction matters for this report. The Qwen edit is recorded as a **sparse parameter edit** to selected columns. Sparse means only some coordinates were changed; low-rank means a matrix update can be expressed using a small number of outer products. They describe different things: a low-rank update can touch most entries, while a sparse update can have high rank. The published manifest and rebuild code classify the released Qwen diff as sparse—not as an SVD or LoRA update.

## How this fits with earlier weight-space research

The new results build on established ideas, but they are not all the same technique:

- **HyperNetworks** generate the weights of another network with a separately trained network. The work goes back at least to 2016.
- **LoRA** trains low-rank update matrices while freezing the base model. It is an efficient adaptation method, not an LLM directly reasoning about each base-model weight.
- **Weights2weights** learns a subspace from over 60,000 customized diffusion models and uses it to sample or edit model weights for visual identities. It is a learned weight-space representation for a specific model family and domain.
- **Graph metanetworks for transformer language models** encode parameters as a graph so a trained GNN can predict model properties while respecting parameter symmetries. This is a learned specialist model, rather than a general chat LLM directly authoring a patch.

The interesting shift in the linked post is the attempt to use a general-purpose LLM as the analyst and editor itself. It is not the first work to generate weights, compress updates, or learn over model parameters; it explores whether a model trained for language and code can reason through those objects with prompting and a task-specific harness.

## What is promising—and what is not established

These experiments suggest that a network's parameters can expose useful structure to an LLM, and that natural-language reasoning may sometimes produce targeted, functional edits. The Qwen edit is especially notable because its released checkpoint, logs, evaluation scripts, and tensor hashes make follow-up inspection possible.

But the limits are just as instructive:

- **Narrow evidence:** many demonstrations use toy networks, controlled tasks, a few model instances, or one edit.
- **Harness dependence:** the larger edits use Python, practice examples, and forward-pass budgets. Results depend on what the agent can inspect and test.
- **Behavior is not provenance:** clues in weights do not prove which exact data trained a model or provide cryptographic auditability.
- **Edits can fail:** the Gemma follow-up did not show a reliable math improvement. Removing one bottleneck is different from adding a missing capability.
- **Evaluation can mislead:** benchmark scores depend on sampling, token limits, graders, and test exposure. Practice-data access and held-out evaluation must be reported separately.
- **Deployment risk:** a small parameter diff can have broad behavioral effects. Preserve the base checkpoint, record hashes, evaluate regressions and safety, and require human review before deployment.

Claims about automatic self-improvement, universal auditing, or safe zero-data editing are possibilities raised by the authors—not capabilities established by these experiments. The result is a research direction worth following, not a replacement for training science, controlled evaluation, or model governance.

## Further reading and primary artifacts

- RikiyaT, [Sparks of Weight Space Programming: LLMs can understand and write neural network weights](https://rikiyat.github.io/blog/weight-space-programming/), research post, 2026.
- [Complete experiment logs, evaluation, and network files](https://github.com/RikiyaT/lm_understand-logs).
- [Qwen edit manifest](https://raw.githubusercontent.com/RikiyaT/lm_understand-logs/main/exp8_math/runs/p50c/edit/manifest.json) and [hash-verifying reconstruction code](https://raw.githubusercontent.com/RikiyaT/lm_understand-logs/main/exp8_math/code/apply_edit.py).
- [Published Qwen3.5-0.8B edited checkpoint and independent evaluation](https://huggingface.co/RikiyaT/Qwen3.5-0.8B-weight-space-programming).
- Bar-Shalom et al., [Graph Metanetworks for Transformer Based Language Models](https://arxiv.org/abs/2610.18471), arXiv preprint, 2026.
- Ha et al., [HyperNetworks](https://arxiv.org/abs/1609.09106), 2016.
- Hu et al., [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685), 2021.
- Dravid et al., [Interpreting the Weight Space of Customized Diffusion Models](https://arxiv.org/abs/2406.09413), NeurIPS 2024.
