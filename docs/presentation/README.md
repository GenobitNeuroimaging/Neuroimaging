# Presentación de avances · GenoBit Neuroimaging

Presentación de ~15 minutos para la comunidad de GenoBit: qué es el Alzheimer, cómo se toman las neuroimágenes,
el estado del arte en predicción y en procesamiento de datos, OASIS-1, CNNs, transformers y atención, el Makers Fair
y en qué va el proyecto.

El motor de diapositivas, la animación de la portada y las imágenes de OASIS vienen de la presentación de
relanzamiento ([Mmateo101/presentation-neuroimaging](https://github.com/Mmateo101/presentation-neuroimaging)).

## Cómo verla

Sírvela desde la raíz del repositorio y abre <http://localhost:8000>:

```bash
python -m http.server 8000 --directory docs/presentation
```

Navegación: clic o → / Espacio para avanzar, ← para regresar, `f` para pantalla completa, `#N` en la URL para
ir a la diapositiva N.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Las 15 diapositivas |
| `assets/css/base.css` | Escenario, transiciones y portada (de la presentación de relanzamiento) |
| `assets/css/deck.css` | Estilos de cada diapositiva |
| `assets/js/cover-brain.js` | Cerebro de líneas de la portada |
| `assets/js/deck.js` | Motor de diapositivas y animaciones de cada escena |
| `assets/generated/` | Cortes reales de OASIS-1, sprites de los tres planos, demos de preprocesamiento, `stats.js` y mapas de características |
| `assets/img/makers-fair.jpg` | Foto del póster en el Makers Fair del Hub de Emprendimiento |
| `tools/make_feature_maps.py` | Genera `fm_*.png` (filtros 3×3 y pooling sobre un corte real) para la diapositiva de CNN |

Los estudios del estado del arte en predicción salen de Nibila y Sivagami (2026), *Front. Artif. Intell.*
El mapa de atención y los colores de PET y RM funcional son ilustrativos, y así lo dicen las diapositivas.
