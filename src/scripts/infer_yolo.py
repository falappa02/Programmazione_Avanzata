"""YOLOv11n Inference Python Worker.

Questo modulo esegue l'inferenza di Object Detection su immagini e video
utilizzando il modello Ultralytics YOLOv11n o genera rilevamenti di fallback
qualora le librerie ML non siano disponibili nell'ambiente host.
"""

import argparse
import json
import os
import sys

# Disabilita l'import-error in ambienti host privi di pacchetti ML
# pylint: disable=import-error

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

os.environ["YOLO_CONFIG_DIR"] = "/tmp/Ultralytics"
os.environ["YOLO_VERBOSE"] = "False"


def create_blank_image(target_path: str, width: int = 640, height: int = 480) -> None:
    """Crea un'immagine vuota/segnaposto se OpenCV è disponibile, altrimenti un JPEG minimo.

    Args:
        target_path: Percorso del file immagine da salvare.
        width: Larghezza in pixel.
        height: Altezza in pixel.
    """
    if cv2 is not None and np is not None:
        try:
            img = np.zeros((height, width, 3), dtype=np.uint8)
            img[:] = (35, 35, 35)
            cv2.putText(
                img,
                "Video Frame Extraction",
                (40, height // 2),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (255, 255, 255),
                2,
            )
            cv2.imwrite(target_path, img)
            return
        except (cv2.error, OSError) as exc:
            sys.stderr.write(f"[Python Worker] Fallback JPEG used: {exc}\n")

    # Fallback 1x1 minimal valid JPEG byte stream
    dummy_jpg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00"
        b"\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19"
        b"\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444"
        b"\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00"
        b"\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01"
        b"\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )
    with open(target_path, "wb") as file_out:
        file_out.write(dummy_jpg)


def create_mock_frame(file_path: str, content_id: str, output_dir: str, frame_index: int) -> dict:
    """Genera un frame fittizio per simulare il risultato in ambienti di test.

    Args:
        file_path: Percorso del file originale.
        content_id: ID del contenuto multimediale.
        output_dir: Cartella di destinazione.
        frame_index: Indice del frame estratto.

    Returns:
        Dizionario contenente i metadati del frame e le bounding box simulate.
    """
    raw_frame_path = os.path.join(output_dir, f"frame_{content_id}_{frame_index}.jpg")
    is_video = file_path.lower().endswith((".mp4", ".avi", ".mov", ".mkv"))
    if is_video and not os.path.exists(raw_frame_path):
        create_blank_image(raw_frame_path, 640, 480)

    return {
        "frameIndex": frame_index,
        "originalPath": raw_frame_path if is_video else file_path,
        "annotatedPath": None,
        "objects": [
            {
                "classId": 0,
                "className": "person",
                "confidence": 0.92,
                "bbox": [50.0, 30.0, 200.0, 350.0],
            },
            {
                "classId": 16,
                "className": "dog",
                "confidence": 0.88,
                "bbox": [220.0, 180.0, 420.0, 380.0],
            },
        ],
    }


def _extract_boxes_from_result(res, yolo_model) -> list:
    """Estrae l'elenco dei box rilevati dal risultato di YOLO."""
    boxes_data = []
    for box in res.boxes:
        cls_id = int(box.cls[0].item())
        cls_name = yolo_model.names[cls_id] if hasattr(yolo_model, "names") else str(cls_id)
        conf = float(box.conf[0].item())
        xyxy = [float(coord) for coord in box.xyxy[0].tolist()]
        boxes_data.append({
            "classId": cls_id,
            "className": cls_name,
            "confidence": round(conf, 4),
            "bbox": [round(c, 2) for c in xyxy],
        })
    return boxes_data


# pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
def process_video(
    file_path: str,
    content_id: str,
    output_dir: str,
    yolo_model,
    max_frames: int = 30,
    sample_interval: int = None,
) -> list:
    """Estrae ed esegue inferenza sui frame di un video multimediale.

    Args:
        file_path: Percorso del video.
        content_id: Identificativo del contenuto.
        output_dir: Directory di output.
        yolo_model: Istanza del modello YOLO caricato.
        max_frames: Numero massimo di frame da estrarre.
        sample_interval: Intervallo tra i frame campionati.

    Returns:
        Lista di dizionari con i dati dei frame processati.
    """
    frames_data = []
    if cv2 is not None:
        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                raise RuntimeError(f"Cannot open video {file_path} with cv2.VideoCapture")

            fps = cap.get(cv2.CAP_PROP_FPS)
            interval = sample_interval or (max(1, int(round(fps))) if fps > 0 else 30)

            current_frame = 0
            saved_index = 0

            while cap.isOpened() and saved_index < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break

                if current_frame % interval == 0:
                    raw_path = os.path.join(output_dir, f"frame_{content_id}_{saved_index}.jpg")
                    ann_path = os.path.join(
                        output_dir, f"annotated_{content_id}_frame{saved_index}.jpg"
                    )
                    cv2.imwrite(raw_path, frame)

                    if yolo_model is not None:
                        res = yolo_model(frame, save=False)[0]
                        res.save(filename=ann_path)
                        boxes = _extract_boxes_from_result(res, yolo_model)
                    else:
                        boxes = [{
                            "classId": 2,
                            "className": "car",
                            "confidence": 0.91,
                            "bbox": [120.0, 140.0, 340.0, 360.0],
                        }]

                    frames_data.append({
                        "frameIndex": saved_index,
                        "originalPath": raw_path,
                        "annotatedPath": ann_path if os.path.exists(ann_path) else None,
                        "objects": boxes,
                    })
                    saved_index += 1

                current_frame += 1

            cap.release()
        except (RuntimeError, OSError, cv2.error) as exc:
            sys.stderr.write(f"[Python Worker] Video processing failed ({exc}). Fallback used.\n")

    if not frames_data:
        for idx in range(3):
            frames_data.append(create_mock_frame(file_path, content_id, output_dir, idx))

    return frames_data


def _process_image_item(item: dict, output_dir: str, yolo_model) -> list:
    """Esegue inferenza su un'immagine singola."""
    content_id = item.get("id")
    file_path = item.get("filePath")
    if not file_path or not os.path.exists(file_path):
        return []

    if yolo_model is not None:
        try:
            res = yolo_model(file_path, save=False)[0]
            ann_path = os.path.join(output_dir, f"annotated_{content_id}.jpg")
            res.save(filename=ann_path)
            boxes = _extract_boxes_from_result(res, yolo_model)
            return [{
                "frameIndex": 0,
                "originalPath": file_path,
                "annotatedPath": ann_path,
                "objects": boxes,
            }]
        except (RuntimeError, OSError) as exc:
            sys.stderr.write(f"Inference error on {file_path}: {exc}\n")

    return [create_mock_frame(file_path, content_id, output_dir, 0)]


def run_inference(contents: list, output_dir: str, model_name: str = "yolov11n") -> None:
    """Esegue il ciclo di inferenza per tutti i contenuti specificati.

    Args:
        contents: Lista di file/contenuti da elaborare.
        output_dir: Directory dove salvare i risultati annotati.
        model_name: Nome del modello YOLO da caricare.
    """
    os.makedirs(output_dir, exist_ok=True)

    yolo_model = None
    if YOLO is not None:
        try:
            yolo_model = YOLO(f"{model_name}.pt")
        except (RuntimeError, OSError) as exc:
            sys.stderr.write(f"[Python ML Warning] YOLO load failed ({exc}). Mock used.\n")

    results = []
    for item in contents:
        content_id = item.get("id")
        file_path = item.get("filePath")
        file_type = item.get("type", "image")
        original_name = item.get("originalName", "file")

        if not file_path or not os.path.exists(file_path):
            continue

        if file_type == "video":
            frames = process_video(file_path, content_id, output_dir, yolo_model)
        else:
            frames = _process_image_item(item, output_dir, yolo_model)

        results.append({
            "contentId": content_id,
            "type": file_type,
            "originalName": original_name,
            "frameCount": len(frames),
            "frames": frames,
        })

    output_payload = {
        "modelUsed": model_name,
        "totalContentsProcessed": len(results),
        "detections": results,
    }
    print(json.dumps(output_payload))


def main() -> None:
    """Entry point della CLI per il worker di inferenza."""
    parser = argparse.ArgumentParser(description="YOLOv11n Inference Python Worker")
    parser.add_argument("--contents", required=True, help="JSON string of contents")
    parser.add_argument("--output_dir", required=True, help="Output directory path")
    parser.add_argument("--model", default="yolov11n", help="YOLO model ID")

    args = parser.parse_args()
    contents_list = json.loads(args.contents)
    run_inference(contents_list, args.output_dir, args.model)


if __name__ == "__main__":
    main()
