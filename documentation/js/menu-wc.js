'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">frontend documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AdminAppInfoPage.html" data-type="entity-link" >AdminAppInfoPage</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminCompaniesPage.html" data-type="entity-link" >AdminCompaniesPage</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminCompanyPage.html" data-type="entity-link" >AdminCompanyPage</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminDashboardPage.html" data-type="entity-link" >AdminDashboardPage</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminFilesPage.html" data-type="entity-link" >AdminFilesPage</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminMessagesPage.html" data-type="entity-link" >AdminMessagesPage</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminShellLayout.html" data-type="entity-link" >AdminShellLayout</a>
                            </li>
                            <li class="link">
                                <a href="components/AdminUsersPage.html" data-type="entity-link" >AdminUsersPage</a>
                            </li>
                            <li class="link">
                                <a href="components/App.html" data-type="entity-link" >App</a>
                            </li>
                            <li class="link">
                                <a href="components/Chat.html" data-type="entity-link" >Chat</a>
                            </li>
                            <li class="link">
                                <a href="components/ChatComposerComponent.html" data-type="entity-link" >ChatComposerComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ChatMessagesListComponent.html" data-type="entity-link" >ChatMessagesListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ForbiddenPage.html" data-type="entity-link" >ForbiddenPage</a>
                            </li>
                            <li class="link">
                                <a href="components/HeaderComponent.html" data-type="entity-link" >HeaderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/HomePage.html" data-type="entity-link" >HomePage</a>
                            </li>
                            <li class="link">
                                <a href="components/LazyChartComponent.html" data-type="entity-link" >LazyChartComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LoginPage.html" data-type="entity-link" >LoginPage</a>
                            </li>
                            <li class="link">
                                <a href="components/NotFoundPage.html" data-type="entity-link" >NotFoundPage</a>
                            </li>
                            <li class="link">
                                <a href="components/ProfileMenuComponent.html" data-type="entity-link" >ProfileMenuComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RegisterPage.html" data-type="entity-link" >RegisterPage</a>
                            </li>
                            <li class="link">
                                <a href="components/SessionCompaniesModalComponent.html" data-type="entity-link" >SessionCompaniesModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SessionFilesModalComponent.html" data-type="entity-link" >SessionFilesModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ShellLayout.html" data-type="entity-link" >ShellLayout</a>
                            </li>
                            <li class="link">
                                <a href="components/SidebarComponent.html" data-type="entity-link" >SidebarComponent</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AdminStatsPort.html" data-type="entity-link" >AdminStatsPort</a>
                            </li>
                            <li class="link">
                                <a href="classes/AppTranslateLoader.html" data-type="entity-link" >AppTranslateLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/DeleteSessionUseCase.html" data-type="entity-link" >DeleteSessionUseCase</a>
                            </li>
                            <li class="link">
                                <a href="classes/GetSessionUseCase.html" data-type="entity-link" >GetSessionUseCase</a>
                            </li>
                            <li class="link">
                                <a href="classes/ListSessionsUseCase.html" data-type="entity-link" >ListSessionsUseCase</a>
                            </li>
                            <li class="link">
                                <a href="classes/SendMessageRestUseCase.html" data-type="entity-link" >SendMessageRestUseCase</a>
                            </li>
                            <li class="link">
                                <a href="classes/SendMessageUseCase.html" data-type="entity-link" >SendMessageUseCase</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AdminAppInfoFacade.html" data-type="entity-link" >AdminAppInfoFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminCompaniesFacade.html" data-type="entity-link" >AdminCompaniesFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminListMessagesUseCase.html" data-type="entity-link" >AdminListMessagesUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminListSessionsUseCase.html" data-type="entity-link" >AdminListSessionsUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminMessagesFacade.html" data-type="entity-link" >AdminMessagesFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminMessagesService.html" data-type="entity-link" >AdminMessagesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminRiskWeightsFacade.html" data-type="entity-link" >AdminRiskWeightsFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminStatsFacade.html" data-type="entity-link" >AdminStatsFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminStatsService.html" data-type="entity-link" >AdminStatsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminUsersFacade.html" data-type="entity-link" >AdminUsersFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AdminUsersService.html" data-type="entity-link" >AdminUsersService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AnalyzeSessionCompaniesUseCase.html" data-type="entity-link" >AnalyzeSessionCompaniesUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AppInfoService.html" data-type="entity-link" >AppInfoService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuthGuardService.html" data-type="entity-link" >AuthGuardService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuthService.html" data-type="entity-link" >AuthService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BackgroundService.html" data-type="entity-link" >BackgroundService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ChatEventsService.html" data-type="entity-link" >ChatEventsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ChatFacade.html" data-type="entity-link" >ChatFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ChatUtilsService.html" data-type="entity-link" >ChatUtilsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CompaniesService.html" data-type="entity-link" >CompaniesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ConnectionStatusService.html" data-type="entity-link" >ConnectionStatusService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CreateUserUseCase.html" data-type="entity-link" >CreateUserUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CustomPreloadStrategy.html" data-type="entity-link" >CustomPreloadStrategy</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/DeleteUserUseCase.html" data-type="entity-link" >DeleteUserUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FilesFacade.html" data-type="entity-link" >FilesFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FilesService.html" data-type="entity-link" >FilesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GetActiveRiskWeightsUseCase.html" data-type="entity-link" >GetActiveRiskWeightsUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GetAppInfoUseCase.html" data-type="entity-link" >GetAppInfoUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GetCompanyByRucUseCase.html" data-type="entity-link" >GetCompanyByRucUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GetKpisUseCase.html" data-type="entity-link" >GetKpisUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GetProfileUseCase.html" data-type="entity-link" >GetProfileUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GuestGuardService.html" data-type="entity-link" >GuestGuardService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/KpisApiService.html" data-type="entity-link" >KpisApiService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/KpisMockService.html" data-type="entity-link" >KpisMockService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/KpisService.html" data-type="entity-link" >KpisService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LanguageService.html" data-type="entity-link" >LanguageService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ListCompaniesUseCase.html" data-type="entity-link" >ListCompaniesUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ListFilesUseCase.html" data-type="entity-link" >ListFilesUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ListSessionFilesUseCase.html" data-type="entity-link" >ListSessionFilesUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ListUsersUseCase.html" data-type="entity-link" >ListUsersUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LoginFacade.html" data-type="entity-link" >LoginFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LoginUseCase.html" data-type="entity-link" >LoginUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MessageManagerService.html" data-type="entity-link" >MessageManagerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PerformanceService.html" data-type="entity-link" >PerformanceService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RegisterFacade.html" data-type="entity-link" >RegisterFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RegisterUseCase.html" data-type="entity-link" >RegisterUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RiskFacade.html" data-type="entity-link" >RiskFacade</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RiskWeightsService.html" data-type="entity-link" >RiskWeightsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RoleGuardService.html" data-type="entity-link" >RoleGuardService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ScrollManagerService.html" data-type="entity-link" >ScrollManagerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SessionsEventsService.html" data-type="entity-link" >SessionsEventsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SessionsService.html" data-type="entity-link" >SessionsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SseService.html" data-type="entity-link" >SseService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ThemeService.html" data-type="entity-link" >ThemeService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TokenStorageService.html" data-type="entity-link" >TokenStorageService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TtsService.html" data-type="entity-link" >TtsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TypewriterService.html" data-type="entity-link" >TypewriterService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UpdateAppInfoUseCase.html" data-type="entity-link" >UpdateAppInfoUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UpdateUserUseCase.html" data-type="entity-link" >UpdateUserUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UploadFileUseCase.html" data-type="entity-link" >UploadFileUseCase</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UpsertRiskWeightsUseCase.html" data-type="entity-link" >UpsertRiskWeightsUseCase</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AdminCompanyDashboardDTO.html" data-type="entity-link" >AdminCompanyDashboardDTO</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminMessageItem.html" data-type="entity-link" >AdminMessageItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminMessagesPort.html" data-type="entity-link" >AdminMessagesPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminSessionItem.html" data-type="entity-link" >AdminSessionItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminStatsDTO.html" data-type="entity-link" >AdminStatsDTO</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminUserItem.html" data-type="entity-link" >AdminUserItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminUserItem-1.html" data-type="entity-link" >AdminUserItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AdminUsersPort.html" data-type="entity-link" >AdminUsersPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AgentModel.html" data-type="entity-link" >AgentModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AggregateInsights.html" data-type="entity-link" >AggregateInsights</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AppInfo.html" data-type="entity-link" >AppInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AppInfoPort.html" data-type="entity-link" >AppInfoPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AudioData.html" data-type="entity-link" >AudioData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthPort.html" data-type="entity-link" >AuthPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseAgentEvent.html" data-type="entity-link" >BaseAgentEvent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChatEntry.html" data-type="entity-link" >ChatEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChatMessage.html" data-type="entity-link" >ChatMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChatStreamPort.html" data-type="entity-link" >ChatStreamPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompaniesPort.html" data-type="entity-link" >CompaniesPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompanyDashboardSummary.html" data-type="entity-link" >CompanyDashboardSummary</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompanyInsights.html" data-type="entity-link" >CompanyInsights</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompanyItem.html" data-type="entity-link" >CompanyItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompanyItem-1.html" data-type="entity-link" >CompanyItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CreateUserPayload.html" data-type="entity-link" >CreateUserPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CreateUserPayload-1.html" data-type="entity-link" >CreateUserPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilesPort.html" data-type="entity-link" >FilesPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImageData.html" data-type="entity-link" >ImageData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Kpis.html" data-type="entity-link" >Kpis</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KpisPort.html" data-type="entity-link" >KpisPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KpisResponseDTO.html" data-type="entity-link" >KpisResponseDTO</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KpisSummaryDisplay.html" data-type="entity-link" >KpisSummaryDisplay</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ListFilesResponse.html" data-type="entity-link" >ListFilesResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ListFilesResponse-1.html" data-type="entity-link" >ListFilesResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoginRequest.html" data-type="entity-link" >LoginRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoginSuccessResponse.html" data-type="entity-link" >LoginSuccessResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Model.html" data-type="entity-link" >Model</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Paginated.html" data-type="entity-link" >Paginated</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginatedApi.html" data-type="entity-link" >PaginatedApi</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginatedApi-1.html" data-type="entity-link" >PaginatedApi</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginatedApi-2.html" data-type="entity-link" >PaginatedApi</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PlaygroundAgentExtraData.html" data-type="entity-link" >PlaygroundAgentExtraData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ReasoningSteps.html" data-type="entity-link" >ReasoningSteps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Reference.html" data-type="entity-link" >Reference</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ReferenceData.html" data-type="entity-link" >ReferenceData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RegisterRequest.html" data-type="entity-link" >RegisterRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RegisterSuccessResponse.html" data-type="entity-link" >RegisterSuccessResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ResponseAudio.html" data-type="entity-link" >ResponseAudio</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RiskWeightsConfig.html" data-type="entity-link" >RiskWeightsConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RiskWeightsConfig-1.html" data-type="entity-link" >RiskWeightsConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RiskWeightsPort.html" data-type="entity-link" >RiskWeightsPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RunResponse.html" data-type="entity-link" >RunResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionCompaniesAnalysis.html" data-type="entity-link" >SessionCompaniesAnalysis</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionCompanyItem.html" data-type="entity-link" >SessionCompanyItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionEntry.html" data-type="entity-link" >SessionEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionsPort.html" data-type="entity-link" >SessionsPort</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SSEMessage.html" data-type="entity-link" >SSEMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SSEMessageModel.html" data-type="entity-link" >SSEMessageModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Storage.html" data-type="entity-link" >Storage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StreamResponse.html" data-type="entity-link" >StreamResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StreamResponseModel.html" data-type="entity-link" >StreamResponseModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TimeSeriesPoint.html" data-type="entity-link" >TimeSeriesPoint</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Tool.html" data-type="entity-link" >Tool</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UploadedFileMeta.html" data-type="entity-link" >UploadedFileMeta</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UploadedFileMeta-1.html" data-type="entity-link" >UploadedFileMeta</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UserProfile.html" data-type="entity-link" >UserProfile</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VideoData.html" data-type="entity-link" >VideoData</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});