"""Arma el manifiesto de videos candidatos para el catálogo TechStar.

Uso: python -I armar_manifiesto.py <izt_senas.json> <ind_senas.json> <salida.json>
Cada candidato se busca por nombre exacto en las listas extraídas de los sitios.
"""
import json
import sys
import unicodedata

izt = json.load(open(sys.argv[1], encoding="utf-8"))
ind = json.load(open(sys.argv[2], encoding="utf-8"))

PAG_IZT = "https://www.iztacalaensena.org/"
PAG_IND = "https://lsm.indiscapacidad.cdmx.gob.mx/ejes/"


def n(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn").strip()


def buscar(fuente, palabra):
    lista = izt if fuente == "IZT" else ind
    hits = [e for e in lista if n(e["palabra"]) == n(palabra)]
    if not hits:
        raise SystemExit(f"No encontrado: {fuente} «{palabra}»")
    return hits


# (entrada, cobertura, [(fuente, palabra), ...])
#   cobertura: completa = la seña dice el mensaje; parcial = solo una parte (falta componer o adaptar);
#              apoyo = vocabulario útil para controles, escala o el reconocedor.
PLAN = [
    ("PAC-S-01", "parcial", [("IZT", "Dolor de cabeza"), ("IND", "Dolor")]),
    ("PAC-S-02", "parcial", [("IZT", "Dolor")]),
    ("PAC-S-03", "parcial", [("IZT", "Dolor de garganta")]),
    ("PAC-S-04", "parcial", [("IZT", "Fiebre"), ("IND", "Fiebre")]),
    ("PAC-S-05", "parcial", [("IZT", "Tos"), ("IND", "Tos (1)"), ("IND", "Tos (2)")]),
    ("PAC-S-06", "parcial", [("IZT", "Mareo"), ("IND", "Mareos"), ("IZT", "¿Estás mareado/a?")]),
    ("PAC-S-07", "parcial", [("IZT", "Nauseas"), ("IND", "Asco (Náuseas)")]),
    ("PAC-S-08", "parcial", [("IZT", "Cansado"), ("IND", "Cansancio")]),
    ("PAC-R-03", "parcial", [("IZT", "No saber"), ("IND", "No Saber")]),
    ("MED-P-01", "parcial", [("IZT", "¿Cuándo?"), ("IZT", "Tiempo")]),
    ("MED-P-02", "completa", [("IZT", "¿Dónde te duele?")]),
    ("MED-P-03", "completa", [("IZT", "¿Eres alérgico/a a algún medicamento?"), ("IZT", "Alergia"), ("IND", "Alergia")]),
    ("MED-P-04", "completa", [("IZT", "¿Estás tomando medicamento?"), ("IZT", "Medicamento"), ("IND", "Medicamento")]),
    ("MED-P-05", "parcial", [("IZT", "¿Tienes fiebre?")]),
    ("MED-P-06", "completa", [("IZT", "¿Vomitaste?"), ("IZT", "Vomitar"), ("IND", "Vómito")]),
    ("MED-R-01", "parcial", [("IZT", "Revisión general médica"), ("IZT", "Ahora"), ("IND", "Ahora")]),
    ("MED-R-02", "parcial", [("IND", "Esperar"), ("IZT", "Por favor"), ("IND", "Por favor")]),
    ("MED-R-03", "parcial", [("IZT", "¿Necesitas intérprete?"), ("IZT", "Interprete"), ("IND", "Intérprete")]),
    ("MED-R-04", "parcial", [("IZT", "Acabar"), ("IND", "Consulta Médica")]),
    ("SIS-NO-ENTENDI", "parcial", [("IZT", "No entender"), ("IZT", "Entender"), ("IND", "Entender")]),
    ("SIS-INTENSIDAD", "parcial", [("IZT", "¿Qué tanto te duele?"), ("IZT", "¿Te duele mucho?"), ("IZT", "Mucho"),
                                   ("IZT", "Poco (forma 1 y 2)"), ("IND", "Mucho"), ("IND", "Poco (1)"), ("IND", "Poco (2)")]
     + [("IND", str(i)) for i in range(1, 11)]),
    ("SIS-DESCARTAR", "apoyo", [("IZT", "Quitar"), ("IZT", "Cambiar")]),
    ("SIS-CONFIRMAR", "apoyo", [("IND", "Enviar (1)"), ("IND", "Enviar (2)"), ("IND", "Enviar (3)")]),
    ("APOYO", "apoyo", [("IZT", "¿Cuáles son tus síntomas?"), ("IZT", "¿Qué sientes?"), ("IND", "Síntomas"),
                        ("IZT", "¿Tienes dolor?"), ("IZT", "¿Te duele la cabeza?"), ("IZT", "¿Tienes náuseas?"),
                        ("IZT", "¿Tienes tos?"), ("IZT", "Gracias"), ("IND", "Gracias"), ("IZT", "Hola"),
                        ("IZT", "Ayudar"), ("IND", "Ayudar"), ("IZT", "Equivocar"), ("IZT", "Descansar")]),
    # Respuestas breves del paciente a las preguntas del médico (agregadas el 17/11/2026, §6.3).
    ("PAC-R-04", "parcial", [("IZT", "Hoy")]),
    ("PAC-R-05", "parcial", [("IZT", "Ayer")]),
    ("PAC-R-06", "parcial", [("IZT", "Antier")]),
    ("PAC-R-07", "parcial", [("IZT", "Semana")]),
    ("PAC-R-08", "parcial", [("IZT", "Mes")]),
    ("PAC-R-09", "completa", [("IZT", "A veces")]),
    ("PAC-R-10", "completa", [("IZT", "Nunca")]),
    ("PAC-R-11", "completa", [("IZT", "Analgésico")]),
    ("PAC-R-12", "completa", [("IZT", "Antibiótico")]),
    ("PAC-R-13", "completa", [("IZT", "Jarabe (medicamento)")]),
    ("PAC-R-14", "completa", [("IZT", "Vitaminas")]),
]

salida, vistos = [], {}
for entrada, cobertura, candidatos in PLAN:
    for fuente, palabra in candidatos:
        for e in buscar(fuente, palabra):
            vid = e["video"].rstrip("/").split("/")[-1].split("=")[-1]
            if vid in vistos:  # mismo video ya listado para otra entrada
                vistos[vid]["entradas"].append(entrada)
                continue
            pagina = PAG_IZT + e["pagina"] if fuente == "IZT" else PAG_IND + e["eje"] + "/"
            item = {
                "youtubeId": vid,
                "fuente": "Iztacala Enseña" if fuente == "IZT" else "Indiscapacidad CDMX (LSM)",
                "senaEnSitio": e["palabra"],
                "paginaOrigen": pagina,
                "urlVideo": "https://www.youtube.com/watch?v=" + vid,
                "entradas": [entrada],
                "cobertura": cobertura,
            }
            vistos[vid] = item
            salida.append(item)

json.dump(salida, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(salida), "videos")
