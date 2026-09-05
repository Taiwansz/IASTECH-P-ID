"""
IASTECH - UNIMAX Hackathon: P&ID Information Extraction Pipeline
Pipeline 100% Offline e Local - Zero Chaves de API externas.
"""
import os
import re
import json
from typing import Dict, List, Optional, Any

MEASURED_VARIABLES = {
    "A": "Analise / Concentracao",
    "B": "Queimador / Chama",
    "C": "Condutividade Eletrica",
    "D": "Densidade / Peso Especifico",
    "E": "Tensao Eletrica",
    "F": "Vazao / Fluxo",
    "G": "Dimensao / Posicao",
    "H": "Comando Manual",
    "I": "Corrente Eletrica",
    "J": "Potencia Eletrica",
    "K": "Tempo / Programacao",
    "L": "Nivel de Liquido",
    "M": "Umidade",
    "N": "Variavel do Usuario",
    "O": "Livre",
    "P": "Pressao",
    "Q": "Quantidade / Totalizacao",
    "R": "Radiacao",
    "S": "Velocidade / Frequencia",
    "T": "Temperatura",
    "U": "Multivariavel",
    "V": "Vibracao / Maquinario",
    "W": "Peso / Forca",
    "X": "Nao Classificado",
    "Y": "Evento / Estado",
    "Z": "Posicao / Dimensao Final",
}

VARIABLE_MODIFIERS = {
    "D": "Diferencial",
    "F": "Razao / Proporcao",
    "J": "Varredura",
    "Q": "Totalizacao / Integracao",
    "S": "Seguranca",
}

FUNCTIONAL_LETTERS = {
    "A": "Alarme",
    "C": "Controlador",
    "E": "Elemento Sensor Primario",
    "I": "Indicador",
    "R": "Registrador",
    "S": "Chave / Switch",
    "T": "Transmissor",
    "V": "Valvula / Atuador Final",
    "Y": "Rele / Computacao",
    "Z": "Elemento Final de Seguranca",
}

FUNCTION_MODIFIERS = {
    "HH": "Muito Alto / Trip",
    "LL": "Muito Baixo / Trip",
    "H": "Alto",
    "L": "Baixo",
    "M": "Medio",
    "D": "Desvio",
}

VALVE_PREFIXES = {
    "CV": "Valvula de Controle",
    "FCV": "Valvula de Controle de Vazao",
    "PCV": "Valvula de Controle de Pressao",
    "LCV": "Valvula de Controle de Nivel",
    "TCV": "Valvula de Controle de Temperatura",
    "PV": "Valvula de Pressao",
    "FV": "Valvula de Vazao",
    "LV": "Valvula de Nivel",
    "TV": "Valvula de Temperatura",
    "HV": "Valvula Manual",
    "XV": "Valvula de Bloqueio Automatico",
    "PSV": "Valvula de Seguranca e Alivio de Pressao",
    "PRV": "Valvula de Alivio de Pressao",
    "SOV": "Valvula Solenoide",
    "MOV": "Valvula Motorizada",
    "AOV": "Valvula com Atuador Pneumatico",
    "GOV": "Valvula Operada a Gas",
    "SDV": "Valvula de Parada de Emergencia (Shutdown)",
    "ESDV": "Valvula de Parada de Emergencia de Processo",
    "BDV": "Valvula de Despressurizacao (Blowdown)",
    "TSV": "Valvula de Seguranca Termica",
    "PVRV": "Valvula de Alivio de Pressao e Vacuo",
    "RO": "Orificio de Restricao",
    "VA": "Valvula de Processo",
}

EQUIPMENT_PREFIXES = {
    "B": "Vaso / Tanque de Armazenamento",
    "C": "Coluna de Destilacao / Fracionamento",
    "CR": "Reator Catalitico",
    "D": "Vaso de Decantacao / Tambor",
    "E": "Trocador de Calor",
    "F": "Filtro Industrial",
    "G": "Gerador",
    "H": "Aquecedor / Forno",
    "K": "Compressor de Processo",
    "M": "Motor Eletrico / Acionador",
    "MJ": "Misturador Mecanico / Jet Mixer",
    "P": "Bomba Centrifuga ou de Deslocamento",
    "R": "Reator Quimico",
    "S": "Separador / Silo",
    "T": "Torre de Processo",
    "TK": "Tanque Cilindrico de Grande Porte",
    "V": "Vaso de Pressao / Balao",
    "VP": "Conjunto Bomba-Acionador de Vacuo",
    "W": "Permutador de Calor / Coluna",
}

DRAWING_NOTE_PATTERN = re.compile(
    r"^(NE|NOTA|NOTE|REV|DWG|DETAIL|DET|SEC|SKID|AREA|PACKAGE|SPEC)[-.]?\d*",
    re.IGNORECASE
)

class IsaClassificationResult:
    def __init__(self, tag: str, detected_type: str, component_class: str, group: str, rationale: str, is_isa_standard: bool):
        self.tag = tag
        self.type = detected_type
        self.component_class = component_class
        self.group = group
        self.rationale = rationale
        self.is_isa_standard = is_isa_standard

    @property
    def formatted_entry(self) -> str:
        return f"{self.tag}={self.type}/{self.component_class}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tag": self.tag,
            "type": self.type,
            "class": self.component_class,
            "group": self.group,
            "formatted": self.formatted_entry,
            "isa_standard": self.is_isa_standard,
            "rationale": self.rationale,
        }

def classify_tag(raw_tag: str, shape_hint: Optional[str] = None) -> IsaClassificationResult:
    tag = raw_tag.strip().upper().replace(" ", "").replace("_", "-")
    
    if DRAWING_NOTE_PATTERN.match(tag):
        return IsaClassificationResult(
            tag=raw_tag,
            detected_type="Drawing Note",
            component_class="Annotation",
            group="Notas e Delimitacoes de Desenho",
            rationale=f"Anotacao tecnica ou referencia de desenho ({tag}). Nao e componente de processo.",
            is_isa_standard=False
        )

    core_tag = re.sub(r"^(\d{1,4}|XX)[-.]?", "", tag)
    match = re.match(r"^([A-Z]{1,6})[-.]?(\d{1,6}(?:[A-Z]|/[A-Z]|\.\d{1,2})?)?$", core_tag)
    if not match:
        clean_letters = re.findall(r"[A-Z]+", core_tag)
        prefix = clean_letters[0] if clean_letters else "TAG"
        suffix = re.findall(r"\d+", core_tag)
        suffix_str = suffix[0] if suffix else "0"
    else:
        prefix, suffix_str = match.group(1), match.group(2) or ""

    if prefix in VALVE_PREFIXES:
        desc = VALVE_PREFIXES[prefix]
        return IsaClassificationResult(
            tag=raw_tag,
            detected_type="Valve",
            component_class="Instrument" if prefix.endswith("V") or prefix in ["CV", "MOV", "SOV", "AOV"] else "Valve",
            group="Valvulas e Elementos Finais",
            rationale=f"{desc} identificada pelo codigo de servico {prefix}.",
            is_isa_standard=True
        )

    # Suporte a prefixo industrial de Pressao Diferencial (DP / dP)
    if prefix.startswith("DP") and len(prefix) >= 3:
        body = prefix[2:]
        funcs = [FUNCTIONAL_LETTERS[l] for l in body if l in FUNCTIONAL_LETTERS]
        type_name = "Diff Pressure Controller" if "C" in body else "Diff Pressure Transmitter" if "T" in body else "Diff Pressure Indicator"
        return IsaClassificationResult(
            tag=raw_tag,
            detected_type=type_name,
            component_class="Instrument",
            group="Instrumentacao e Controle (ISA-5.1)",
            rationale=f"Instrumento de Pressao Diferencial: {', '.join(funcs) if funcs else 'Controle/Indicacao'}.",
            is_isa_standard=True
        )

    if len(prefix) >= 2 and prefix[0] in MEASURED_VARIABLES:
        first_char = prefix[0]
        var_name = MEASURED_VARIABLES[first_char]
        body = prefix[1:]

        fn_mod = None
        rem = body
        if len(body) >= 3 and body.endswith(("HH", "LL")):
            fn_mod = FUNCTION_MODIFIERS[body[-2:]]
            rem = body[:-2]
        elif len(body) >= 2 and body.endswith(("H", "L", "M", "D")):
            fn_mod = FUNCTION_MODIFIERS[body[-1]]
            rem = body[:-1]

        var_mod = None
        functional_part = rem
        if len(rem) >= 2 and rem[0] in VARIABLE_MODIFIERS:
            if rem[0] != "S" or (len(rem) >= 2 and rem[1] in ["E", "D", "V"]):
                var_mod = VARIABLE_MODIFIERS[rem[0]]
                functional_part = rem[1:]

        if functional_part and all(l in FUNCTIONAL_LETTERS for l in functional_part):
            funcs = [FUNCTIONAL_LETTERS[l] for l in functional_part]
            type_name = "Sensor" if "E" in functional_part else \
                        "Transmitter" if "T" in functional_part else \
                        "Controller" if "C" in functional_part else \
                        "Indicator" if "I" in functional_part else \
                        "Switch" if "S" in functional_part else \
                        "Alarm" if "A" in functional_part else \
                        "Valve" if "V" in functional_part else "Instrument"
            
            var_short = var_name.split()[0]
            detailed_type = f"{var_short} {type_name}" if type_name != "Valve" else "Valve"
            
            return IsaClassificationResult(
                tag=raw_tag,
                detected_type=detailed_type,
                component_class="Instrument",
                group="Instrumentacao e Controle (ISA-5.1)",
                rationale=f"Instrumento ISA-5.1: {', '.join(funcs)} de {var_name}.",
                is_isa_standard=True
            )

    if prefix in EQUIPMENT_PREFIXES:
        desc = EQUIPMENT_PREFIXES[prefix]
        eq_type = "Pump" if prefix in ["P", "VP"] else \
                  "Heat Exchanger" if prefix in ["E", "W"] else \
                  "Vessel" if prefix in ["B", "D", "V", "TK"] else \
                  "Column" if prefix in ["C", "T"] else \
                  "Compressor" if prefix == "K" else \
                  "Motor" if prefix in ["M", "MJ"] else \
                  "Reactor" if prefix in ["R", "CR"] else "Equipment"
        
        return IsaClassificationResult(
            tag=raw_tag,
            detected_type=eq_type,
            component_class="Equipment",
            group="Equipamentos de Processo",
            rationale=f"{desc} identificado pelo prefixo de engenharia {prefix}.",
            is_isa_standard=True
        )

    if shape_hint:
        if shape_hint == "circle":
            return IsaClassificationResult(
                tag=raw_tag,
                detected_type="Instrument",
                component_class="Instrument",
                group="Instrumentacao Nao-ISA",
                rationale="Simbolo em balao circular identificado como Instrumento via heuristica visual.",
                is_isa_standard=False
            )
        elif shape_hint == "valve-pair":
            return IsaClassificationResult(
                tag=raw_tag,
                detected_type="Valve",
                component_class="Instrument",
                group="Valvulas Nao-ISA",
                rationale="Simbolo de triangulos opostos identificado como Valvula via heuristica visual.",
                is_isa_standard=False
            )

    if raw_tag.startswith("M") and any(c.isdigit() for c in raw_tag):
        return IsaClassificationResult(
            tag=raw_tag,
            detected_type="Motor",
            component_class="Equipment",
            group="Equipamentos de Processo (Fallback)",
            rationale="Heuristica de prefixo mecanico: M seguido de numeros = Motor de Processo.",
            is_isa_standard=False
        )
    if raw_tag.startswith("P") and any(c.isdigit() for c in raw_tag):
        return IsaClassificationResult(
            tag=raw_tag,
            detected_type="Pump",
            component_class="Equipment",
            group="Equipamentos de Processo (Fallback)",
            rationale="Heuristica de prefixo mecanico: P seguido de numeros = Bomba de Processo.",
            is_isa_standard=False
        )

    return IsaClassificationResult(
        tag=raw_tag,
        detected_type="Unknown",
        component_class="Group",
        group="TAG Nao Classificado",
        rationale=f"TAG {raw_tag} fora da norma ISA-5.1 e sem correspondencia deterministica clara.",
        is_isa_standard=False
    )

def run_pipeline(tags: List[str], shape_hints: Optional[Dict[str, str]] = None) -> List[IsaClassificationResult]:
    shape_hints = shape_hints or {}
    return [classify_tag(tag, shape_hint=shape_hints.get(tag)) for tag in tags]
