# The Geometry of Suffering: Mapping the DSM-5 in Vector Space (And Why Psychiatric AI is Chasing a Ghost)

*Author: Lee Boonstra*  
*Published: June 26, 2026*  

---

As an engineer, I look at the world through the lens of data architecture, relational integrity, database schemas, and decision trees. If a system's database has circular dependencies, porous boundaries, or redundant records, we call it a bad design and refactor it. 

Yet, the most authoritative database of human suffering—the American Psychiatric Association’s **DSM-5-TR** (Diagnostic and Statistical Manual of Mental Disorders)—violates almost every principle of clean data architecture.

Lately, I've been reading Daniel Oberhaus’s book, *The Silicon Shrink: How Artificial Intelligence Made the World an Asylum*. In Chapter 4, Oberhaus critiques **"digital phenotyping"**—the idea that we can passively track smartphone keystrokes, typing cadences, and language choices to map human behavior back to DSM diagnoses. His argument is that this tracking is fundamentally flawed because the underlying foundation—the DSM itself—is broken. If the diagnostic categories are arbitrary and unscientific, training AI to detect them is just automating subjectivity.

As I read, a question hit me: 

> *What if the linguistic boundaries of the DSM are so overlapping and redundant that the math of vector spaces exposes them as an artificial illusion?*

So, being an applied AI engineer with a three-day weekend, a Google Cloud project, Antigravity, and a healthy dose of professional skepticism, I decided to build an engineering proof. I wanted to map the entire DSM-5 into high-dimensional vector space, project it down to a 2D canvas, and see what the geometry of clinical language actually looks like. 

The results are mathematically clear, clinically chaotic, and raise serious questions about the future of Psychiatric AI.

You can explore the live, interactive proof and run the simulations yourself here:  
👉 **[Interactive DSM-5 Vector Space Visualizer](https://savelee.github.io/dsm-in-vector-space/)**

---

## The Relational Collapse: Biology vs. Categorical Boxes

In traditional physical medicine, diagnostic models are built on **discrete, biologically isolated decision trees**. If you present with a respiratory illness, determining whether you have a **Common Cold vs. COVID-19** is a binary, physically verifiable classification. You either have the rhinovirus or the SARS-CoV-2 virus. The diagnostic boundaries are clear, mutually exclusive, and grounded in objective biology.

In contrast, **psychiatric diagnostics lack biological boundaries**. Because we cannot peer into the brain to read a clean bio-marker for depression or anxiety, the DSM-5-TR relies on a *categorical classification model*. It defines complex mental disorders not by unique pathologies, but as arbitrary checklists of overlapping, descriptive behaviors.

When distinct diagnostic categories share identical symptom definitions (e.g., fatigue, sleep disturbances, concentration difficulties), the boundaries between disorders become porous and fundamentally entangled. This creates massive **overlaps** and **tautological loops** where a clinician is mathematically forced to diagnose a patient with multiple conditions simultaneously, which are not neccessarily the case, it just proves that the model is wrong.


## Engineering the Proof: Scraping, Structuring, and Embedding

I broke the experiment into three phases: 
1. extracting and synthesizing the DSM-5 data, 
2. normalizing it into a clean relational database, 
3. and encoding the clinical text into dense vector representations.

Finally I've created a companion web app to visualize the results in 2D space:
👉 **[Interactive DSM-5 Vector Space Visualizer](https://savelee.github.io/dsm-in-vector-space/)**

Because the APA aggressively copyrights the DSM-5-TR to monetize the manual, there is no clean, open-source `dsm5.json` or public database sitting on an open registry. 

To bypass this, I uploaded a PDF of an easy-to-explain DSM-5 guide into **[NotebookLM](https://notebooklm.google/)**. NotebookLM's source-grounded synthesis was highly effective: it allowed me to quickly extract the core diagnostic concepts and define clean JSON datastructures. From there, I wrote Python scripts to parse the criteria, run quality checks, and ensure the symptom matching and labeling aligned with clinical definitions.

The resulting clean dataset was organized into official chapters in our [data directory](https://github.com/savelee/dsm-in-vector-space/tree/main/data), culminating in a [master diagnoses list](https://github.com/savelee/dsm-in-vector-space/blob/main/data/diagnoses.json) and a [consolidated symptom dictionary](https://github.com/savelee/dsm-in-vector-space/blob/main/data/unique_symptoms.json).

With a clean dataset of clinical descriptions, I generated dense vector representations using Google Cloud's **`text-embedding-005`** model on Vertex AI. 

I configured the API call with `task_type="CLUSTERING"` to ensure the model treated each symptom description as an independent semantic entity in a 768-dimensional space, rather than a search query:

```python
# Extract from our embedding generator script
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput

vertexai.init(project=PROJECT_ID, location="global")
model = TextEmbeddingModel.from_pretrained("text-embedding-005")

# Run batch embeddings with the CLUSTERING task type
inputs = [
    TextEmbeddingInput(text=text, task_type="CLUSTERING") 
    for text in symptom_texts
]
response = model.get_embeddings(inputs)
symptom_vectors = [emb.values for emb in response]
```

The resulting high-dimensional vector representations were saved in our [pre-computed embedding cache](https://github.com/savelee/dsm-in-vector-space/blob/main/embeddings/embeddings_text_embedding_005.json) to optimize performance.

---

## Mapping the Geometry of Clinical Language

To translate these 768-dimensional vectors into a visual format, I built a client-side **React + TypeScript + Vite** web application: [`modern-viz/`](https://github.com/savelee/dsm-in-vector-space/tree/main/modern-viz). It runs entirely in the browser without a backend. The application uses **t-SNE** (t-Distributed Stochastic Neighbor Embedding) to project the high-dimensional coordinates down to a 2D grid, alongside an interactive, physics-based network graph.

The web app exposes three distinct layers of the DSM's structural collapse:

### 1. The Topological Network Graph
Using an [interactive network mapping component](https://github.com/savelee/dsm-in-vector-space/blob/main/modern-viz/src/components/NetworkGraph.tsx), the app constructs a physics-based network where **Disorder Nodes** connect to **Symptom Nodes**. Filtering by chapter immediately exposes the overlap. You can drag nodes and watch how symptoms like fatigue, insomnia, and concentration difficulties act as gravity wells, pulling separate disorders together.

### 2. The Semantic Vector Space
This tab projects the text of the clinical descriptions into a [2D semantic space visualization](https://github.com/savelee/dsm-in-vector-space/blob/main/modern-viz/src/components/SemanticSpace.tsx). You can toggle between three levels:
* **Symptom Semantic Space**: Maps individual symptoms in 2D space.
* **Symptom-Disorder Overlap**: Select two disorders—like **Major Depressive Disorder (MDD)** and **Generalized Anxiety Disorder (GAD)**—to see their symptoms land in the exact same coordinate space.
* **Diagnosis Semantic Space (Centroids)**: Maps the average vector (centroid) of each disorder's symptom profile to see which diagnoses are semantically identical.

### 3. The Virtual Shrink Simulator
To turn this math into a practical demonstration, I built an [interactive clinical simulator](https://github.com/savelee/dsm-in-vector-space/blob/main/modern-viz/src/components/VirtualShrink.tsx), backed by a [custom diagnostic logic engine](https://github.com/savelee/dsm-in-vector-space/blob/main/modern-viz/src/utils/diagnosticEngine.ts). As you select symptoms, the engine filters the DSM database and calculates a **"System Ambiguity Score"** (clinical entropy).

If you input an overlapping clinical profile, the engine triggers a **"Comorbidity Loop Warning"** and spikes the entropy meter, proving the categorical model cannot resolve the patient into a single box.

---

## The Anxiety-Depression Vortex: A Visual Proof

To see how easily the DSM's categorical architecture collapses, we can diagram the **Anxiety-Depression Vortex**. When a patient presents with fatigue, sleep disturbances, poor concentration, and restlessness, the diagnostic engine enters a permanent, circular loop:

```mermaid
graph TD
    %% Nodes
    Patient([Patient Presentation])
    
    S_Fatigue[Symptom: Fatigue / Low Energy]
    S_Sleep[Symptom: Insomnia / Hypersomnia]
    S_Conc[Symptom: Poor Concentration]
    S_Rest[Symptom: Restlessness / On Edge]
    
    MDD[Major Depressive Disorder]
    GAD[Generalized Anxiety Disorder]
    
    DiagnosticEngine{Categorical Filter}
    
    Loop[Comorbidity Vortex: 50/50 Tautological Split]
    
    %% Connections
    Patient --> S_Fatigue
    Patient --> S_Sleep
    Patient --> S_Conc
    Patient --> S_Rest
    
    S_Fatigue --> MDD
    S_Sleep --> MDD
    S_Conc --> MDD
    S_Rest --> MDD
    
    S_Fatigue --> GAD
    S_Sleep --> GAD
    S_Conc --> GAD
    S_Rest --> GAD
    
    MDD --> DiagnosticEngine
    GAD --> DiagnosticEngine
    
    DiagnosticEngine -->|Cannot resolve boundaries| Loop
    Loop -->|Forced clinical overlap| MDD
    Loop -->|Forced clinical overlap| GAD
    
    classDef disorder fill:#0e7490,stroke:#06b6d4,stroke-width:2px,color:#fff;
    classDef symptom fill:#c2410c,stroke:#f97316,stroke-width:2px,color:#fff;
    classDef vortex fill:#701a75,stroke:#d946ef,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    
    class MDD,GAD disorder;
    class S_Fatigue,S_Sleep,S_Conc,S_Rest symptom;
    class Loop vortex;
```

## Three Technical Revelations from the Vector Space

By analyzing the geometric clusters generated by `text-embedding-005`, we can extract three critical lessons that challenge the very foundation of Computational Psychiatry and Psychiatric AI (PAI):

### 1. The Tautology Trap
When looking at the Symptom Semantic Space, I noticed a strange, tight cluster of highly unrelated symptoms pulling together near the edge of the graph. When I inspected the raw text, the cause became obvious: these sentences all contained the standard legalistic boilerplate: *"The symptoms cause clinically significant distress or impairment in social, occupational, or other important areas of functioning."*

Because the manual repeats this phrasing across hundreds of disorders, the embedding model groups these different clinical realities in the same coordinates. This is a **Tautology Trap**—proving the DSM often groups conditions based on administrative boilerplate rather than clinical reality.

### 2. Language is the Glitch
In psychiatric research, there is a highly debated concept called the **p-factor**—a single, general factor of psychopathology suggesting that if a patient has one mental health issue, they are statistically predisposed to experience others. 

Our vector space suggests a much simpler, more humbling explanation: **the p-factor is a linguistic artifact**. The language used to write the DSM is highly redundant. The text embeddings prove that many diagnoses are mathematically "close" simply because the APA used the same words to describe different constructs. The overlap isn't necessarily a deep biological secret; it's a structural design defect in the manual's language.

> [!IMPORTANT]
> **Why Psychiatric AI is Chasing a Ghost**  
> Training AI models on passive smartphone data to predict DSM labels is a dead end. If the underlying labels are mathematically entangled, a model boasting high accuracy isn't discovering a biological truth. It is just predicting the circular language of the manual and automating a flawed baseline.

---

## Bringing the Code Into the Clinic

Once the interactive web client was fully operational, I couldn't resist showing it to my therapist. She also does research with the Gottman Institute—an organization famous for trying to turn relationship stability into literal mathematical equations—so she is no stranger to structured data frameworks.

I opened my laptop during a session, pulled up the [Semantic Vector Space](https://github.com/savelee/dsm-in-vector-space/blob/main/modern-viz/src/components/SemanticSpace.tsx), and showed her the actual geometric coordinates of Major Depression and Generalized Anxiety. We watched the symptoms land directly on top of each other. 

Her reaction was immediate: *"This is exactly what I see in the clinic every day. We are forced to check separate boxes for insurance billing, but in reality, we are looking at a continuous, fluid spectrum of human distress."*

Showing a clinician the actual mathematical proof of their daily frustration was an incredibly powerful bridge between applied software engineering and clinical psychology. 

## The Path Forward

If we want to build truly revolutionary AI systems for mental health, we must stop trying to automate the rigid, 20th-century box models of the DSM. 

A static vector map is only a starting point. True clinical understanding is not just a coordinate; it is a trajectory. This is why the human conversation between a patient and a therapist remains irreplaceable. A vector embedding might capture the semantic similarity of symptoms, but it cannot untangle the complex, temporal choreography of a life: the precise **order of sequence** (e.g., did the insomnia trigger the panic, or did the insomnia cause the panic?), the downstream **behavioral consequences**, the **situational timing and duration**, and the deeply personal narrative context. The therapist’s office is where these static coordinates are animated into a coherent, dynamic story.

The market is telling us the truth. It's time for the industry to listen.
Now, **I am not a psychiatrist, nor have I ever studied psychiatry.** I am a just a software engineer with his laptop and toolkit.
But in a way, that is exactly the point. This experiment proves why specialized verticals, like medicine, law, finance, and logistics, can benefit immensely from working more closely with software and systems engineers. 

When you spend your entire career inside a single discipline, you naturally adopt its consensus assumptions, its vocabulary, and its traditional structures (like the DSM's categorical boxes) as absolute "truth." But when a software engineer looks at the exact same domain, they don't see academic consensus; they see **data architecture, relational integrity, schemas, and state machines**. 

When we collaborate across boundaries—combining the deep contextual wisdom of the domain expert with the rigorous, systems-level architecture of the engineer—we stop automating the flaws of the past and start building the architecture of the future.
