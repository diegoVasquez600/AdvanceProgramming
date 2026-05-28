# Informe Detallado de Auditoria de Variables Proxy y Modelo Final Eficiente

Fecha: 2026-05-28
Proyecto: Clasificacion multiclase de ciclo de cultivo (EVA Colombia)

## 1. Resumen Ejecutivo

Este informe documenta una auditoria completa para verificar si el rendimiento casi perfecto del notebook original estaba influenciado por variables proxy (variables que, en la practica, contienen una representacion casi directa de la clase objetivo).

Resultado principal:
- El rendimiento original estaba inflado por columnas con fuerte fuga semantica de informacion.
- Se construyo un escenario final proxy-safe, removiendo variables de alto riesgo.
- El desempeno final sigue siendo bueno y mucho mas realista para generalizacion.

## 2. Objetivo y Alcance

Objetivos:
1. Re-auditar de forma ampliada la presencia de variables proxy.
2. Definir un conjunto de columnas a excluir para entrenamiento robusto.
3. Comparar rendimiento original vs proxy-safe por modelo.
4. Documentar evidencia completa (tablas, graficas y metricas).
5. Dejar el notebook final preparado en modo eficiente y anti-proxy.

Alcance:
- Dataset EVA procesado en notebook de modelado.
- Comparacion sobre los modelos LogisticRegression, SVM_RBF, RandomForest y KNN.
- Metricas de evaluacion principales: f1_macro y accuracy.

## 3. Metodologia de Deteccion de Proxies

Se aplicaron dos estrategias complementarias:

1. Lookup por variable individual (train->test)
- Para cada variable candidata, se construyo una tabla de correspondencia categoria -> clase mayoritaria en train.
- Luego se predijo test usando solo esa variable.
- Si una variable sola alcanza f1_macro muy alto, hay riesgo de proxy.

2. Comparacion de escenarios de modelado
- Escenario original (con variables completas).
- Escenario proxy-safe (sin columnas de riesgo definido).
- Comparacion por modelo, por metrica y por caida de f1_macro.

## 4. Evidencia 1: Ranking de Riesgo Proxy

Grafica principal:

![Top 15 variables por riesgo proxy](./assets/proxy_ranking_top15.png)

Tabla completa exportada:

- [proxy_screening_full.csv](./proxy_screening_full.csv)

Principales variables detectadas:

| Variable | f1_macro lookup | Nivel |
|---|---:|---|
| cultivo | 0.998413 | critico |
| desagregaci_n_regional_y | 0.998413 | critico |
| nombre_cientifico | 0.994406 | critico |
| subgrupo_de_cultivo | 0.991670 | critico |
| estado_fisico_produccion | 0.867511 | medio |
| grupo_de_cultivo | 0.816486 | medio |

Interpretacion:
- cultivo, desagregaci_n_regional_y, nombre_cientifico y subgrupo_de_cultivo practicamente permiten reconstruir la clase objetivo.
- estado_fisico_produccion y grupo_de_cultivo tambien cargan senal alta, aunque menor.

Sustento causal (por que afectaban tanto):
- cultivo y subgrupo_de_cultivo son niveles taxonomicos del mismo fenomeno agronomico que define la estacionalidad productiva, por lo que contienen informacion casi equivalente al ciclo.
- desagregaci_n_regional_y replica semantica de cultivo en muchos registros, funcionando como una segunda codificacion del mismo atributo.
- nombre_cientifico mapea casi 1 a 1 con cultivo para varias especies, aportando otra via de reconstruccion indirecta de la clase.
- estado_fisico_produccion se relaciona con el tipo de producto cosechado (fruto, tuberculo, grano), que a su vez correlaciona fuertemente con la temporalidad del cultivo.

## 5. Evidencia 2: Con vs Sin Proxies Detectadas (Filtro Critico/Alto)

Grafica:

![Comparacion con y sin proxies detectadas](./assets/compare_with_without_proxies.png)

Tabla:

- [compare_with_without_proxies.csv](./compare_with_without_proxies.csv)

Resultado observado:
- Al remover solo proxies criticos/altos detectados por umbral automatizado, el rendimiento no cae de forma relevante.

Interpretacion tecnica:
- Esto indica que todavia quedan variables con senal proxy residual (especialmente variables de nivel medio) que mantienen desempeno casi perfecto.
- Por eso se aplico un escenario final mas estricto (proxy-safe) con lista conservadora.

Lectura adicional:
- Este resultado fue clave para no detener la limpieza en el primer filtro automatizado.
- Metodologicamente, si al quitar variables criticas el desempeno no cae, se debe iterar con un criterio mas conservador y validar por familias de variables relacionadas.

## 6. Escenario Final Proxy-Safe (Version Eficiente Recomendada)

Columnas removidas en escenario final:
1. cultivo
2. subgrupo_de_cultivo
3. nombre_cientifico
4. estado_fisico_produccion
5. desagregaci_n_regional_y

Razon:
- Las cuatro primeras criticas concentran fuga semantica de la clase.
- estado_fisico_produccion se removio por criterio conservador de robustez (aunque estaba en nivel medio), para reducir atajos de clasificacion.

## 7. Evidencia 3: Comparacion Final de Modelos en Proxy-Safe

Grafica:

![Comparacion final de modelos en escenario proxy-safe](./assets/final_proxy_safe_f1_by_model.png)

Tabla:

- [final_proxy_safe_model_comparison.csv](./final_proxy_safe_model_comparison.csv)

Resultados (proxy-safe):

| Modelo | Accuracy | Precision Macro | Recall Macro | F1 Macro |
|---|---:|---:|---:|---:|
| RandomForest | 0.969583 | 0.909990 | 0.930890 | 0.919730 |
| LogisticRegression | 0.946667 | 0.854304 | 0.941015 | 0.881241 |
| SVM_RBF | 0.947917 | 0.855344 | 0.932299 | 0.880991 |
| KNN | 0.931667 | 0.810029 | 0.764326 | 0.780020 |

Conclusion de desempeno:
- El mejor modelo en escenario realista es RandomForest (f1_macro = 0.919730).
- El ranking final cambia frente al escenario con proxies.
- El orden final sugiere que RandomForest captura mejor interacciones no lineales utiles aun despues de remover atajos semanticos.

## 8. Evidencia 4: Matriz de Confusion del Mejor Modelo Proxy-Safe

Grafica:

![Matriz de confusion del mejor modelo proxy-safe](./assets/final_proxy_safe_confusion_matrix.png)

Hallazgos:
- TRANSITORIO: casi perfecto.
- PERMANENTE: alto desempeno, con errores moderados hacia ANUAL.
- ANUAL: clase mas dificil (recall menor), consistente con desbalance y menor representacion.

Interpretacion:
- El problema sigue siendo resoluble, pero ahora refleja dificultad real entre clases y no solo memorizacion por proxies.
- La clase ANUAL concentra la mayor dificultad, lo cual es consistente con su menor soporte y con fronteras de decision menos separables sin variables atajo.

## 9. Evidencia 5: Caida de F1 por Modelo (Original vs Proxy-Safe)

Grafica:

![Caida de F1 por modelo al pasar de original a proxy-safe](./assets/f1_model_compare_original_vs_proxy_safe.png)

Tabla:

- [model_f1_drop_proxy_safe_vs_original.csv](./model_f1_drop_proxy_safe_vs_original.csv)

Caida observada:

| Modelo | F1 original | F1 proxy-safe | Caida |
|---|---:|---:|---:|
| KNN | 0.974997 | 0.780020 | 0.194977 |
| SVM_RBF | 0.998838 | 0.880991 | 0.117847 |
| LogisticRegression | 0.998843 | 0.881241 | 0.117602 |
| RandomForest | 0.997869 | 0.919730 | 0.078139 |

Interpretacion:
- KNN era el mas dependiente de estructura proxy.
- RandomForest fue el mas robusto tras limpieza anti-proxy.

Sustento tecnico de la diferencia entre modelos:
- KNN depende de vecindad y distancia; cuando se eliminan variables casi-identificadoras, su geometria pierde separacion inmediata y cae mas.
- SVM y Logistic conservan buen nivel por capacidad de separar fronteras globales, pero su caida confirma que tambien aprovechaban proxies.
- RandomForest resiste mejor porque combina particiones no lineales y agregacion de arboles, aprovechando senales distribuidas en varias columnas no proxy.

## 10. Ajustes Realizados en el Notebook para Dejarlo Eficiente

Mejoras implementadas:
1. Modo proxy-safe en utilidades de features
- Se incorporo exclusion por defecto de proxies fuertes desde la funcion de armado de variables.

2. Auditoria ampliada integrada
- El notebook ahora detecta proxies de forma automatizada y exporta evidencia.

3. Export de resultados y graficas
- Tablas y figuras quedan guardadas en carpeta de reportes para trazabilidad.

4. Escenario final reproducible
- Se agrego una seccion final de modelado sin proxies, con comparacion y matriz de confusion.

## 11. Recomendaciones Finales

1. Para reportes academicos y despliegue, usar siempre el escenario proxy-safe como referencia principal.
2. Mantener escenario original solo como control metodologico, no como estimacion real de generalizacion.
3. Si se requiere mas robustez, evaluar validacion temporal (por ano) para detectar fuga por estabilidad historica.
4. Incluir balance de clases y analisis por clase (ANUAL/PERMANENTE/TRANSITORIO) en toda conclusion.
5. Mantener este flujo de auditoria en futuras iteraciones para detectar nuevas variables proxy.

Recomendacion de reporte academico:
- Presentar siempre dos bloques: "resultado con variables completas" y "resultado proxy-safe".
- Declarar explicitamente que el segundo bloque es la estimacion principal de generalizacion.
- Reportar la caida de metrica como evidencia de control de fuga, no como deterioro del trabajo.

## 12. Carpeta Designada de Entregables

Ruta de entrega del informe y evidencias:
- reports/informe_modelado_proxy_safe

Contenido generado:
- [INFORME_DETALLADO_PROXY_SAFE.md](./INFORME_DETALLADO_PROXY_SAFE.md)
- [proxy_screening_full.csv](./proxy_screening_full.csv)
- [compare_with_without_proxies.csv](./compare_with_without_proxies.csv)
- [final_proxy_safe_model_comparison.csv](./final_proxy_safe_model_comparison.csv)
- [model_f1_drop_proxy_safe_vs_original.csv](./model_f1_drop_proxy_safe_vs_original.csv)
- [proxy_ranking_top15.png](./assets/proxy_ranking_top15.png)
- [compare_with_without_proxies.png](./assets/compare_with_without_proxies.png)
- [final_proxy_safe_f1_by_model.png](./assets/final_proxy_safe_f1_by_model.png)
- [final_proxy_safe_confusion_matrix.png](./assets/final_proxy_safe_confusion_matrix.png)
- [f1_model_compare_original_vs_proxy_safe.png](./assets/f1_model_compare_original_vs_proxy_safe.png)
