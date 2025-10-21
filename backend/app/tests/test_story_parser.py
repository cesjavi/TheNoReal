from app.services.story_parser import parse_story_response


def test_parse_story_response_with_tags():
    text = (
        "2025-10-21T05:04:29.510Z [info] [CAPITULO]\n"
        "La ciudad olvidada de Ashwood seguía en silencio.\n"
        "[/CAPITULO]\n\n"
        "[OPCIONES]\n"
        "Opción 1: Investigar la fuente cubierta de musgo.\n"
        "Opción 2: Buscar pistas en el ayuntamiento abandonado.\n"
        "[/OPCIONES]"
    )

    result = parse_story_response(text, options_per_decision=2)

    assert result.story == "La ciudad olvidada de Ashwood seguía en silencio."
    assert result.options == [
        "Investigar la fuente cubierta de musgo.",
        "Buscar pistas en el ayuntamiento abandonado.",
    ]
    assert result.is_final is False


def test_parse_story_response_with_separator():
    text = (
        "Un capítulo clásico.\n\n"
        "---\n"
        "1. Continuar explorando la caverna.\n"
        "2. Regresar a la aldea para reagruparse."
    )

    result = parse_story_response(text, options_per_decision=2)

    assert result.story == "Un capítulo clásico."
    assert result.options == [
        "Continuar explorando la caverna.",
        "Regresar a la aldea para reagruparse.",
    ]
    assert result.is_final is False


def test_parse_story_response_finalized():
    text = (
        "[CAPÍTULO]\n"
        "La historia llega a su fin.\n"
        "[/CAPÍTULO]\n"
        "FINALIZADO"
    )

    result = parse_story_response(text, options_per_decision=2)

    assert result.story == "La historia llega a su fin."
    assert result.options == []
    assert result.is_final is True
