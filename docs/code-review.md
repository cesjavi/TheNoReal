# Observaciones y propuestas de mejora

## `app/components/StoryForm.tsx`
- **Reutilización de código y legibilidad**. El componente concentra más de 600 líneas mezclando estado, efectos, helpers y JSX. Extraer la lógica de fondos, la normalización de `config` y las operaciones con la API a hooks utilitarios (`useBackgroundAssets`, `usePromptGenerator`, etc.) reduciría renders innecesarios y facilitaría las pruebas unitarias. También permitiría aislar helpers puros en módulos separados para que no se redefinan en cada render.  
- **Normalización consistente de idioma**. El `handleSubmit` respeta el idioma forzado en la configuración (`config.ajustes.idioma`), pero los siguientes turnos dependen de `locale` sin aplicar `normalizeLocale`, perdiendo el idioma personalizado. Centralizar la derivación del idioma en un helper compartido evitaría divergencias entre el primer capítulo y los continuaciones.  
- **Gestión de errores**. El `catch` final de `handleSubmit` siempre muestra `"Error al conectar con el servidor"`, aun cuando la API responde con un JSON útil. Exponer el mensaje específico del backend, así como bloquear reintentos mientras la petición está en vuelo, mejoraría la UX.  
- **Accesibilidad**. Al superar el límite de tokens sólo se muestra un texto rojo sin asociarlo al `textarea`. Usar `aria-live` o `aria-describedby` y cambiar el atributo `aria-invalid` haría más claro el estado para lectores de pantalla.  
- **Estados derivados**. El límite de palabras objetivo (`targetWords`) se sincroniza manualmente en varios puntos. Cambiarlo a un `useEffect` dependiente de `config.ajustes.targetWords` (o almacenar todo dentro de `config`) reduciría inconsistencias, especialmente cuando se cierra el modal de configuración.

## `app/components/Story.tsx`
- **Persistencia de contexto**. `handleBack` reinicia `chapters` a sólo el capítulo inicial, perdiendo el prompt del usuario que se usa como prólogo. Mantener la tupla `[userPrompt, initialStory]` o regenerarla desde props evitaría la pérdida de información cuando se regresa a editar.  
- **Selección de idioma**. Tanto `handleSelect` como `handleFinalize` envían `language: locale`, ignorando el idioma fijado manualmente en `StoryForm`. Reutilizar el helper mencionado arriba mantendría coherencia entre turnos.  
- **Feedback de errores**. Se usan `alert()` con mensajes hardcodeados y con erratas (`continuar1`, `2la`). Reemplazarlas por un estado de error renderizado dentro del componente impediría bloquear la UI y permitiría traducir los textos desde `next-intl`.  
- **Reintentos y límites**. El bucle para regenerar opciones dispara hasta tres peticiones secuenciales sin control de abort ni backoff. Implementar abort controllers y límites basados en tiempo protegería al usuario ante respuestas lentas de la API.  
- **A11y y foco**. Al agregar nuevos capítulos no se gestiona el foco; ofrecer un botón con `aria-live="polite"` o desplazar el foco al encabezado del nuevo capítulo mejoraría la experiencia para teclado/lectores de pantalla.

## `app/api/story/route.ts`
- **Autenticación**. Se ignora el resultado de `getServerSession` (la comprobación está comentada). Restablecer la validación o introducir un flag de entorno que permita desactivar la autenticación explícitamente cerraría el endpoint.  
- **Gestión de claves**. Se crea siempre la instancia de `Groq` aunque falte `GROQ_API_KEY`; inicializar perezosamente permitiría fallar antes y simplificar pruebas.  
- **Trazabilidad**. El `try`/`catch` externo retorna sólo un mensaje genérico. Añadir un `requestId` y loggear parámetros clave ayudaría a depurar problemas de producción.  
- **Control de reintentos**. Se recalcula temperatura/top_p aumentando gradualmente pero nunca se actualiza `metaBlock` con la huella recién generada cuando se continúa un loop por similitud. Guardar la huella únicamente tras aceptar la respuesta o actualizar `metaBlock` con un flag evitaría que la API memorize historias rechazadas.  
- **Timeouts configurables**. `withTimeout` usa 30s fijos; exponerlo mediante `process.env` ayudaría a ajustar según plan de Groq o según despliegue serverless.

## `app/providers/LanguageProvider.tsx`
- **Ciclos de carga**. Cuando `normalizeLocale` ajusta el locale (por ejemplo `es-AR` → `es`), se llama a `setLocale` dentro del efecto que depende de `locale`, generando una segunda petición inmediata. Guardar el valor derivado en un estado separado (`requestedLocale`) o memorizar los bundles por locale evitaría cargas duplicadas.  
- **Fallback más rico**. Si todas las peticiones fallan se devuelve un provider sin mensajes, lo que rompe `useTranslations`. Renderizar un mensaje de error o degradar a un bundle mínimo evitaría dejar la UI vacía.

## Ideas transversales
- Introducir pruebas de integración ligeras con `@testing-library/react` para `StoryForm` y `Story`, especialmente para validar la serialización de payloads y la gestión del límite de tokens.  
- Centralizar las llamadas `fetch` en un cliente con manejo de errores consistente, soporte de abort y logging, reutilizable tanto en componentes como en API routes.  
- Documentar el flujo principal (prompt → historia → opciones) en el README e incluir diagramas simples ayudaría a nuevos contribuyentes.
