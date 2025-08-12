# Frontend del Asistente IA

- [Documentación completa del programa](https://hackiaton-agent-ai-frontend-doc.vercel.app/)

Este proyecto es una aplicación web desarrollada con Angular que proporciona una interfaz de usuario para interactuar con un asistente de inteligencia artificial. Incluye funcionalidades tanto para usuarios finales como para administradores.

## ✨ Características Principales

- **Interfaz de Chat Interactiva**: Comunicación en tiempo real con el asistente IA.
- **Panel de Administración**:
  - Gestión de usuarios, empresas y mensajes.
  - Visualización de estadísticas de uso.
  - Configuración de la aplicación y ponderaciones de riesgo.
- **Autenticación y Autorización**: Sistema de login/registro y guardias por roles.
- **Soporte Multi-idioma**: Interfaz traducible.
- **Tema Oscuro/Claro**: Personalización de la apariencia.
- **Diseño Responsivo**: Adaptable a diferentes tamaños de pantalla.

## 🛠️ Stack Tecnológico

- **Framework**: [Angular](https://angular.dev/) v20
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) y [Angular Material](https://material.angular.io/)
- **Traducciones**: [NGX-Translate](https://github.com/ngx-translate/core)
- **Visualización de Datos**: [Chart.js](https://www.chartjs.org/)
- **Documentación**: [Compodoc](https://compodoc.app/)

## 🏛️ Arquitectura del Software

Este proyecto implementa una variante de la **Arquitectura Limpia** (Clean Architecture), diseñada para ser escalable, mantenible y desacoplada del framework. Las responsabilidades se dividen en capas bien definidas, asegurando que la lógica de negocio (`core`) sea independiente de la UI y de la infraestructura.

### Flujo de Datos y Dependencias

El flujo de control y la regla de dependencias siguen un camino estricto: **Presentation → Application → Core ← Infrastructure**.

Esto significa que la capa de `presentation` depende de `application`, `application` depende de `core`, y `infrastructure` también depende de `core`, pero `core` no depende de ninguna otra capa. Esto se logra mediante la **Inversión de Dependencias**.

1.  Un **Componente** en `presentation` captura una interacción del usuario (ej. un clic en "Enviar").
2.  Llama a un método en una **Facade** de la capa `application` (ej. `chatFacade.sendMessage(text)`).
3.  La **Facade** ejecuta uno o más **Casos de Uso** de la capa `core` (ej. `sendMessageUseCase.execute(text)`).
4.  El **Caso de Uso** contiene la lógica de negocio pura y utiliza **Puertos** (interfaces) para acceder a datos externos (ej. `sessionsPort.saveMessage(message)`).
5.  La capa `infrastructure` proporciona la implementación concreta de esos **Puertos** a través de la inyección de dependencias de Angular. El Caso de Uso no sabe si los datos se guardan en una API REST, localStorage o un mock.
6.  Los datos regresan por el mismo camino, a menudo transformados por **Adaptadores** para ajustarse a los modelos requeridos por cada capa.

### Descripción de las Capas (`src/app`)

#### `core`
Es el corazón de la aplicación. No tiene dependencias de Angular (salvo las de inyección de dependencias) ni de ninguna otra tecnología externa. Es teóricamente portable a otro framework.

-   **`models`**: Define las entidades y objetos de valor del dominio. Son clases o interfaces TypeScript puras (ej: `UserProfile`, `ChatMessage`).
-   **`ports`**: Define las interfaces (contratos) que la lógica de negocio necesita para comunicarse con el mundo exterior. Por ejemplo, `AuthPort` define un método `login(credentials): Observable<UserProfile>`, pero no cómo se implementa.
-   **`use-cases`**: Contiene la lógica de negocio específica. Cada caso de uso es una clase que orquesta el flujo de datos para realizar una tarea concreta (ej: `LoginUseCase`, `SendMessageUseCase`). Dependen de los `ports`, no de las implementaciones.

#### `application`
Actúa como un mediador entre la capa de presentación y el `core`. Simplifica las interacciones para la UI y maneja el estado.

-   **`facades`**: Son servicios de Angular que exponen un API sencilla para los componentes. Gestionan el estado de la aplicación (usando `BehaviorSubject`, `Signal`, etc.) y coordinan la ejecución de los casos de uso. Por ejemplo, `LoginFacade` podría manejar el estado de carga, los errores y el perfil del usuario para que los componentes solo tengan que suscribirse a observables simples.

#### `infrastructure`
Contiene las implementaciones concretas y la lógica dependiente de tecnologías o plataformas externas, principalmente Angular y las APIs REST.

-   **`services`**: Implementaciones de los `ports` del `core`. Por ejemplo, `AuthService` implementa `AuthPort` y utiliza el `HttpClient` de Angular para realizar las peticiones a la API de backend.
-   **`guards`**: Guardias de rutas de Angular (`CanActivate`) que utilizan las `facades` o los `use-cases` para proteger las rutas.
-   **`interceptors`**: Interceptores HTTP para añadir cabeceras (como tokens de autenticación) a las peticiones salientes.
-   **`adapters`**: Funciones que convierten datos entre los modelos del backend (DTOs - Data Transfer Objects) y los modelos del `core`.

#### `presentation`
Es la capa de UI, lo que el usuario ve y con lo que interactúa. Está compuesta exclusivamente por componentes de Angular.

-   **`pages`**: Componentes "inteligentes" o de vista, que se corresponden con una ruta. Orquestan la presentación de datos y manejan las interacciones del usuario, delegando toda la lógica de negocio a las `facades`.
-   **`components`**: Componentes "tontos" o reutilizables. Reciben datos a través de `@Input()` y emiten eventos con `@Output()`. No tienen lógica de negocio y pueden ser usados en múltiples páginas.
-   **`layouts`**: Definen la estructura principal de la página (ej: `ShellLayout` con la barra lateral y la cabecera, o `AdminShellLayout` para el panel de administración).

## 🚀 Uso y Scripts Disponibles

Asegúrate de tener [Node.js](https://nodejs.org/) y [Bun](https://bun.sh/) (o npm/yarn) instalados.

1.  **Instalar dependencias**:
    ```bash
    bun install
    ```
    o
    ```bash
    npm install
    ```

2.  **Servidor de Desarrollo**:
    Ejecuta `ng serve` o el script `start` para iniciar el servidor de desarrollo.
    ```bash
    npm run start
    ```
    Navega a `http://localhost:4200/`. La aplicación se recargará automáticamente si cambias algún archivo fuente.

3.  **Compilar para Producción**:
    ```bash
    npm run build
    ```
    Los artefactos de la compilación se almacenarán en el directorio `dist/`.

4.  **Ejecutar Pruebas Unitarias**:
    ```bash
    npm run test
    ```
    Ejecuta las pruebas unitarias a través de Karma.

5.  **Generar Documentación Técnica**:
    Este comando utiliza Compodoc para generar una documentación detallada a partir de los comentarios y la estructura del código.
    ```bash
    npm run compodoc:build
    ```
    La documentación estará disponible en la carpeta `documentation/`. Puedes abrir el archivo `documentation/index.html` en tu navegador para explorarla.

## 📚 Documentación Completa

Para una visión más profunda de la arquitectura, componentes, servicios y flujos de datos, consulta la documentación generada por Compodoc.

- **Ruta**: `file:///C:/Users/lesqu/Documents/proyectos/hackiaton-agente-ia/frontend/documentation/index.html`

Esta documentación es tu mejor recurso para entender a fondo el código del proyecto.