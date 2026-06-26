"""Script to generate text-embedding-005 embeddings for DSM-5 diagnoses and symptoms using Vertex AI."""

import argparse
import json
import os
import sys
from typing import Dict, Any, List

import vertexai
from vertexai.language_models import TextEmbeddingInput, TextEmbeddingModel


def load_json_file(file_path: str) -> Any:
    """Loads and parses a JSON file from the filesystem.

    Args:
        file_path: Absolute or relative path to the JSON file.

    Returns:
        The parsed JSON data.
    """
    if not os.path.exists(file_path):
        print(f"Error: Required file not found at {file_path}")
        sys.exit(1)
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def construct_diagnosis_text(diagnosis: Dict[str, Any]) -> str:
    """Constructs a rich semantic string representing a diagnosis for embedding.

    Args:
        diagnosis: A dictionary containing diagnosis fields.

    Returns:
        A formatted text string optimized for semantic search retrieval.
    """
    name = diagnosis.get("diagnosis_name", "Unknown Diagnosis")
    category = diagnosis.get("chapter_category", "Unknown Chapter")
    threshold = diagnosis.get("threshold_count", "No threshold specified")
    duration = diagnosis.get("duration_rule", "No duration specified")

    return (
        f"Diagnosis: {name}. "
        f"Category: {category}. "
        f"Diagnostic Threshold: {threshold}. "
        f"Duration Rules: {duration}."
    )


def construct_symptom_text(symptom: Dict[str, Any]) -> str:
    """Constructs a rich semantic string representing a symptom for embedding.

    Args:
        symptom: A dictionary containing symptom fields.

    Returns:
        A formatted text string optimized for semantic search retrieval.
    """
    symptom_id = symptom.get("symptom_id", "Unknown Symptom")
    symptom_name = symptom.get("symptom_name", "Unnamed Symptom")
    description = symptom.get("symptom_description", "")
    if not description:
        description = symptom.get("description", "")

    return f"Symptom {symptom_id} ({symptom_name}): {description}"


def generate_embeddings_batch(
    texts: List[str],
    project_id: str,
    location: str,
    model_name: str,
) -> List[List[float]]:
    """Calls Vertex AI to generate embeddings for a list of texts in batches of 250.

    Args:
        texts: A list of string segments to embed.
        project_id: The Google Cloud Project ID.
        location: The GCP region (e.g., us-central1).
        model_name: The Vertex AI text embedding model name.

    Returns:
        A list of vector embeddings.
    """
    print(f"Initializing Vertex AI in project '{project_id}' ({location})...")
    vertexai.init(project=project_id, location=location)

    print(f"Loading pretrained model '{model_name}'...")
    model = TextEmbeddingModel.from_pretrained(model_name)

    all_vectors = []
    batch_size = 250  # Vertex AI maximum batch size limit

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        print(
            f"Processing batch {i // batch_size + 1}/{(len(texts) - 1) // batch_size + 1} ({len(batch)} items)..."
        )

        inputs = [TextEmbeddingInput(text, "RETRIEVAL_DOCUMENT") for text in batch]
        results = model.get_embeddings(inputs)
        all_vectors.extend([r.values for r in results])

    return all_vectors


def main() -> None:
    """Main execution function parsing arguments and coordinating embedding generation."""
    parser = argparse.ArgumentParser(
        description="Generate text-embedding-005 embeddings for diagnoses and symptoms."
    )
    parser.add_argument(
        "--project",
        required=True,
        help="Google Cloud Project ID for Vertex AI",
    )
    parser.add_argument(
        "--location",
        default="us-central1",
        help="GCP Region for Vertex AI (default: us-central1)",
    )
    parser.add_argument(
        "--model",
        default="text-embedding-005",
        help="Vertex AI Embedding Model Name (default: text-embedding-005)",
    )
    parser.add_argument(
        "--output",
        default="embeddings/embeddings_text_embedding_005.json",
        help="Path to save the generated embeddings JSON cache (default: embeddings/embeddings_text_embedding_005.json)",
    )

    args = parser.parse_args()

    # Define paths relative to repository root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    diagnoses_path = os.path.join(base_dir, "data", "diagnoses.json")
    symptoms_path = os.path.join(base_dir, "data", "unique_symptoms.json")
    output_path = os.path.join(base_dir, args.output)

    print("Loading source datasets...")
    diagnoses = load_json_file(diagnoses_path)
    symptoms = load_json_file(symptoms_path)

    print(f"Loaded {len(diagnoses)} diagnoses and {len(symptoms)} symptoms.")

    # Build queue of items to embed
    embedding_queue = []
    item_metadata = []  # Maps queue index back to (id, type)

    # Prepare diagnoses
    for dx in diagnoses:
        dx_id = dx.get("diagnosis_id")
        if dx_id:
            text = construct_diagnosis_text(dx)
            embedding_queue.append(text)
            item_metadata.append({"id": dx_id, "type": "diagnosis"})

    # Prepare symptoms
    for sym in symptoms:
        sym_id = sym.get("symptom_id")
        if sym_id:
            text = construct_symptom_text(sym)
            embedding_queue.append(text)
            item_metadata.append({"id": sym_id, "type": "symptom"})

    total_items = len(embedding_queue)
    print(f"Generated {total_items} semantic texts to embed. Starting API requests...")

    # Generate embeddings
    vectors = generate_embeddings_batch(
        texts=embedding_queue,
        project_id=args.project,
        location=args.location,
        model_name=args.model,
    )

    # Package output mapping
    vector_map = {}
    for meta, vector in zip(item_metadata, vectors):
        vector_map[meta["id"]] = {
            "type": meta["type"],
            "vector": vector,
        }

    output_data = {
        "model": args.model,
        "dimension": len(vectors[0]) if vectors else 0,
        "vectors": vector_map,
    }

    # Save to file
    print(f"Saving generated embeddings to {output_path}...")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    print("Embedding generation completed successfully.")


if __name__ == "__main__":
    main()
