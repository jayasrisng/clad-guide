import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {Frame} from "SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {TextInputArea} from "SpectaclesUIKit.lspkg/Scripts/Components/TextInputArea/TextInputArea"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material
const backIcon = requireAsset("../Icons/arrow_back.png") as Texture
const forwardIcon = requireAsset("../Icons/arrow_forward.png") as Texture
const locationIcon = requireAsset("../Icons/location_on.png") as Texture
const guideGhostIcon = requireAsset("../Icons/guide_ghost.png") as Texture

const GOLD = new vec4(1, 0.72, 0.08, 1)
const GOLD_SOFT = new vec4(1, 0.78, 0.18, 0.82)
const CARD_BLACK = new vec4(0, 0, 0, 1)
const CARD_BLACK_HOVER = new vec4(0.025, 0.018, 0.006, 1)

const FONT_SIZE_SCALE = 1.0
type TextRole = "Title2" | "Headline1" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title2: {size: 93, weight: 700},
  Headline1: {size: 54, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}

function applyTextRole(text: Text, role: TextRole): void {
  text.size = TYPE_SCALE[role].size * FONT_SIZE_SCALE
  ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

@component
export class GuideUI extends BaseScriptComponent {
  @ui.label('<span style="color:#60A5FA;">Guide Presentation</span>')
  @ui.separator
  @ui.group_start("Layout")
  @input
  @hint("Panel width in centimeters at the default 110 cm focal distance.")
  @widget(new SliderWidget(40, 52, 1))
  panelWidth: number = 48

  @input
  @hint("Panel height in centimeters at the default 110 cm focal distance.")
  @widget(new SliderWidget(50, 60, 1))
  panelHeight: number = 56

  @input
  @hint("Visible photo width in centimeters.")
  @widget(new SliderWidget(36, 48, 1))
  photoWidth: number = 44

  @input
  @hint("Visible photo height in centimeters.")
  @widget(new SliderWidget(20, 30, 1))
  photoHeight: number = 25
  @ui.group_end

  @ui.group_start("Copy")
  @input
  @hint("Label shown on the back navigation control.")
  previousLabel: string = "Previous"

  @input
  @hint("Label shown on the forward navigation control.")
  nextLabel: string = "Next"
  @ui.group_end

  private readonly createGuideEvent = new Event<string>()
  private readonly arrivedYesEvent = new Event<void>()
  private readonly arrivedNotYetEvent = new Event<void>()
  private readonly previousEvent = new Event<void>()
  private readonly nextEvent = new Event<void>()
  private readonly replayRoomGuideEvent = new Event<void>()
  private readonly restartExperienceEvent = new Event<void>()
  public readonly onCreateGuide = this.createGuideEvent.publicApi()
  public readonly onArrivedYes = this.arrivedYesEvent.publicApi()
  public readonly onArrivedNotYet = this.arrivedNotYetEvent.publicApi()
  public readonly onPrevious = this.previousEvent.publicApi()
  public readonly onNext = this.nextEvent.publicApi()
  public readonly onReplayRoomGuide = this.replayRoomGuideEvent.publicApi()
  public readonly onRestartExperience = this.restartExperienceEvent.publicApi()

  private contentHost: SceneObject | null = null
  private backdropObject: SceneObject | null = null
  private activePane: SceneObject | null = null
  private frame: Frame | null = null
  private inputArea: TextInputArea | null = null
  private inputStatus: Text | null = null
  private arrivalStatus: Text | null = null
  private photoImage: Image | null = null
  private titleText: Text | null = null
  private descriptionText: Text | null = null
  private progressText: Text | null = null
  private previousButton: Button | null = null
  private nextButton: Button | null = null
  private spatialPhotoImage: Image | null = null
  private spatialPhotoMaterial: Material | null = null
  private spatialMarkerObject: SceneObject | null = null
  private spatialMarkerMaterial: Material | null = null
  private roomGlowObject: SceneObject | null = null
  private roomGlowMaterial: Material | null = null
  private spatialArrowText: Text | null = null
  private spatialInstructionText: Text | null = null
  private spatialDetailText: Text | null = null
  private spatialProgressText: Text | null = null
  private spatialArrowCard: SceneObject | null = null
  private spatialInstructionCard: SceneObject | null = null
  private spatialDetailCard: SceneObject | null = null
  private spatialProgressCard: SceneObject | null = null
  private roomWelcomeCard: SceneObject | null = null
  private roomPopupButton: Button | null = null
  private roomCompletionRoot: SceneObject | null = null
  private ghostCompanionObject: SceneObject | null = null
  private ghostCompanionMaterial: Material | null = null
  private ghostTargetPosition: vec3 = new vec3(-20, 22, 0.3)
  private ghostCurrentPosition: vec3 = new vec3(-20, 22, 0.3)
  private ghostBaseScale: number = 4.0
  private roomWelcomeText: Text | null = null
  private readonly spatialTextColors = new Map<Text, vec4>()
  private roomMode: boolean = false
  private roomIntroActive: boolean = false
  private roomItemVisible: boolean = false
  private roomTransitionPhase: "idle" | "out" | "in" = "idle"
  private roomTransitionStartedAt: number = 0
  private roomGhostRevealStartedAt: number = 0
  private roomIntroGhostTimer: DelayedCallbackEvent | null = null
  private roomIntroItemTimer: DelayedCallbackEvent | null = null
  private requestedPreviousEnabled: boolean = true
  private requestedNextEnabled: boolean = true
  private pendingMode: "entry" | "review" | "arrival" | "spatial" = "entry"
  private pendingGeneratedSteps: string[] = []
  private pendingPhoto: Texture | null = null
  private pendingTitle: string = "Loading guide…"
  private pendingDescription: string = ""
  private pendingProgress: string = "1 / 6"
  private pendingMarkerX: number = 0
  private pendingMarkerY: number = 0
  private pendingArrow: string = "↓"
  private pendingDetail: string = ""

  onAwake(): void {
    const deferredBuild = this.createEvent("DelayedCallbackEvent")
    deferredBuild.bind(() => this.initializeUI())
    deferredBuild.reset(0.05)
  }

  private initializeUI(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const frame = this.sceneObject.createComponent(Frame.getTypeName()) as Frame
    this.frame = frame
    frame.autoShowHide = false
    frame.autoScaleContent = false
    frame.allowScaling = false
    frame.allowTranslation = true

    frame.onInitialized.add(() => {
      const effectiveHeight = Math.max(this.panelHeight, 56)
      frame.innerSize = new vec2(this.panelWidth, effectiveHeight)
      frame.padding = new vec2(1.2, 1.2)
      const frameSurface = frame.roundedRectangle
      if (frameSurface) this.styleCardSurface(frameSurface, 0.16)
      frame.setUseFollow(true)
      frame.setFollowing(true)
      this.contentHost = this.object(frame.contentTransform.getSceneObject(), "GuideContent", new vec3(0, 0, 0.6))
      const backdrop = this.object(this.contentHost, "GuideBlackGoldBackdrop", new vec3(0, 0, -0.08))
      const backdropSurface = backdrop.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
      backdropSurface.size = new vec2(this.panelWidth - 0.4, effectiveHeight - 0.4)
      backdropSurface.cornerRadius = 2.1
      this.styleCardSurface(backdropSurface, 0.18)
      this.backdropObject = backdrop
      this.renderPendingMode()
    })

    const pulse = this.createEvent("UpdateEvent")
    pulse.bind(() => this.updateSpatialAnimation())
  }

  public showInstructionEntry(): void {
    this.pendingMode = "entry"
    if (this.frame) this.frame.opacity = 0
    this.setBackdropVisible(true)
    if (this.contentHost) this.buildEntryPane()
  }

  public resetExperience(): void {
    if (this.roomIntroGhostTimer) this.roomIntroGhostTimer.enabled = false
    if (this.roomIntroItemTimer) this.roomIntroItemTimer.enabled = false
    this.roomMode = false
    this.roomIntroActive = false
    this.roomItemVisible = false
    this.roomTransitionPhase = "idle"
    this.roomGhostRevealStartedAt = 0
    this.requestedPreviousEnabled = false
    this.requestedNextEnabled = false
    this.pendingGeneratedSteps = []
    this.pendingPhoto = null
    this.pendingTitle = "Loading guide…"
    this.pendingDescription = ""
    this.pendingProgress = "1 / 6"
    this.pendingMarkerX = 0
    this.pendingMarkerY = 0
    this.pendingArrow = "↓"
    this.pendingDetail = ""
    this.showInstructionEntry()
  }

  public showInputError(message: string): void {
    if (this.inputStatus) this.inputStatus.text = message
  }

  public showGeneratedSteps(steps: string[]): void {
    this.pendingGeneratedSteps = steps
    this.pendingMode = "review"
    if (this.frame) this.frame.opacity = 0
    this.setBackdropVisible(true)
    if (this.contentHost) this.buildReviewPane()
  }

  public showArrivalPrompt(): void {
    this.pendingMode = "arrival"
    if (this.frame) this.frame.opacity = 0
    this.setBackdropVisible(true)
    if (this.contentHost) this.buildArrivalPane()
  }

  public showWaitingMessage(): void {
    if (this.arrivalStatus) this.arrivalStatus.text = "No problem — Guide will wait here until you arrive."
  }

  public showNavigation(): void {
    this.pendingMode = "spatial"
    this.roomMode = false
    this.roomIntroActive = false
    if (this.frame) this.frame.opacity = 0
    this.setBackdropVisible(false)
    if (this.contentHost) this.buildSpatialPane()
  }

  public beginRoomGuide(photo: Texture): void {
    if (this.roomCompletionRoot) {
      this.roomCompletionRoot.destroy()
      this.roomCompletionRoot = null
    }
    this.pendingPhoto = photo
    this.roomMode = true
    this.roomIntroActive = true
    this.roomItemVisible = false
    this.roomTransitionPhase = "idle"
    this.setRoomNavigationVisible(false)
    if (this.roomPopupButton) this.roomPopupButton.inactive = true
    if (!this.spatialPhotoImage && this.contentHost) this.buildSpatialPane()
    this.setRoomNavigationVisible(false)
    if (this.spatialArrowCard) this.spatialArrowCard.enabled = true
    if (this.spatialInstructionCard) this.spatialInstructionCard.enabled = true
    if (this.spatialDetailCard) this.spatialDetailCard.enabled = false
    if (this.spatialProgressCard) this.spatialProgressCard.enabled = true
    if (this.spatialPhotoImage) this.spatialPhotoImage.mainPass.baseTex = photo
    if (this.spatialPhotoMaterial) this.spatialPhotoMaterial.mainPass.baseColor = new vec4(1, 1, 1, 1)
    if (this.ghostCompanionMaterial) this.ghostCompanionMaterial.mainPass.baseTex = guideGhostIcon
    this.ghostTargetPosition = new vec3(-20, 22, 0.3)
    this.ghostCurrentPosition = new vec3(-20, 22, 0.3)
    if (this.ghostCompanionObject) {
      this.ghostCompanionObject.getTransform().setLocalPosition(this.ghostCurrentPosition)
      this.ghostCompanionObject.getTransform().setLocalScale(new vec3(4.2, 4.2, 1))
    }
    if (this.roomWelcomeText) {
      this.roomWelcomeText.text = ""
      this.setSpatialTextAlpha(this.roomWelcomeText, 0)
    }
    this.setCardOpacity(this.roomWelcomeCard, 0)
    this.roomWelcomeCard?.getTransform().setLocalScale(new vec3(0.001, 0.001, 1))
    this.setRoomItemAmount(0)
    if (this.spatialProgressText) this.spatialProgressText.text = ""
    this.applyNavigationOpacity(false, false)

    if (!this.roomIntroGhostTimer) {
      this.roomIntroGhostTimer = this.createEvent("DelayedCallbackEvent")
      this.roomIntroGhostTimer.bind(() => this.revealRoomGhost())
    }
    if (!this.roomIntroItemTimer) {
      this.roomIntroItemTimer = this.createEvent("DelayedCallbackEvent")
      this.roomIntroItemTimer.bind(() => this.revealFirstRoomItem())
    }
    this.roomIntroGhostTimer.enabled = true
    this.roomIntroItemTimer.enabled = true
    this.roomIntroGhostTimer.reset(0.8)
    this.roomIntroItemTimer.reset(1.9)
  }

  public showRoomCompletion(): void {
    if (!this.activePane || !this.roomMode) return
    this.roomIntroActive = false
    this.roomItemVisible = false
    this.roomTransitionPhase = "idle"
    if (this.roomPopupButton) this.roomPopupButton.inactive = true
    this.setRoomItemAmount(0)
    this.spatialArrowCard && (this.spatialArrowCard.enabled = false)
    this.spatialInstructionCard && (this.spatialInstructionCard.enabled = false)
    this.spatialDetailCard && (this.spatialDetailCard.enabled = false)
    this.spatialProgressCard && (this.spatialProgressCard.enabled = false)
    if (this.roomCompletionRoot) this.roomCompletionRoot.destroy()

    const root = this.object(this.activePane, "RoomGuideCompletion", new vec3(0, -2, 0.5))
    const surface = root.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    surface.size = new vec2(30, 19)
    surface.cornerRadius = 1.8
    this.styleCardSurface(surface, 0.16)

    const content = this.object(root, "RoomGuideCompletionContent", new vec3(0, 0, 0.12))
    const column = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    column.autoDiscoverItemsOnStart = false
    column.width = 28
    column.height = 17
    column.direction = FlexDirection.Column
    column.alignItems = FlexAlign.Center
    column.justifyContent = FlexJustify.Center
    column.rowGap = 0.8
    column.paddingTop = 0.6
    column.paddingRight = 0.8
    column.paddingBottom = 0.6
    column.paddingLeft = 0.8

    this.addText(
      content,
      "RoomGuideCompleteTitle",
      "You’re all set ✨",
      4,
      "Headline1",
      HorizontalAlignment.Center
    )
    this.addButton(content, "ReplayRoomGuideButton", "Replay Room Guide", null, 22, () => {
      this.replayRoomGuideEvent.invoke()
    })
    this.addButton(content, "StartOverButton", "Start Over", null, 22, () => {
      this.restartExperienceEvent.invoke()
    })
    this.roomCompletionRoot = root
    this.ghostTargetPosition = new vec3(-18, -14, 0.6)
  }

  public setRoomStep(
    photo: Texture,
    instruction: string,
    markerX: number,
    markerY: number,
    arrow: string,
    progress: string,
    detail: string
  ): void {
    this.pendingPhoto = photo
    this.pendingTitle = detail.length > 0 ? `${instruction}\n${detail}` : instruction
    this.pendingMarkerX = markerX
    this.pendingMarkerY = markerY
    this.pendingArrow = arrow
    this.pendingProgress = progress
    this.pendingDetail = ""
    if (this.roomIntroActive) return
    if (!this.roomItemVisible) {
      this.applyPendingSpatialStep()
      this.startRoomItemReveal()
      return
    }
    this.roomTransitionPhase = "out"
    this.roomTransitionStartedAt = getTime()
    if (this.roomPopupButton) this.roomPopupButton.inactive = true
  }

  public setSpatialStep(
    photo: Texture,
    instruction: string,
    markerX: number,
    markerY: number,
    arrow: string,
    progress: string,
    detail: string
  ): void {
    this.leaveRoomMode()
    this.pendingPhoto = photo
    this.pendingTitle = instruction
    this.pendingMarkerX = markerX
    this.pendingMarkerY = markerY
    this.pendingArrow = arrow
    this.pendingProgress = progress
    this.pendingDetail = detail
    this.applyPendingSpatialStep()
  }

  private leaveRoomMode(): void {
    if (!this.roomMode) return
    this.roomMode = false
    this.roomIntroActive = false
    this.roomItemVisible = false
    this.roomTransitionPhase = "idle"
    this.roomGhostRevealStartedAt = 0
    if (this.roomIntroGhostTimer) this.roomIntroGhostTimer.enabled = false
    if (this.roomIntroItemTimer) this.roomIntroItemTimer.enabled = false
    if (this.roomGlowObject) this.roomGlowObject.getTransform().setLocalScale(new vec3(0, 0, 1))
    if (this.roomGlowMaterial) this.roomGlowMaterial.mainPass.baseColor = new vec4(1, 0.72, 0.08, 0)
    if (this.ghostCompanionMaterial) this.ghostCompanionMaterial.mainPass.baseTex = guideGhostIcon
    if (this.ghostCompanionObject) {
      this.ghostCompanionObject.getTransform().setLocalScale(new vec3(4.0, 4.0, 1))
    }
    this.setRoomNavigationVisible(true)
    if (this.roomPopupButton) this.roomPopupButton.inactive = true
    if (this.roomWelcomeText) this.roomWelcomeText.text = ""
    this.setSpatialTextAlphaIfPresent(this.spatialArrowText, 1)
    this.setSpatialTextAlphaIfPresent(this.spatialInstructionText, 1)
    this.setSpatialTextAlphaIfPresent(this.spatialDetailText, 1)
    this.setSpatialTextAlphaIfPresent(this.spatialProgressText, 1)
  }

  public setStep(photo: Texture, title: string, description: string, index: number, total: number): void {
    this.pendingPhoto = photo
    this.pendingTitle = title
    this.pendingDescription = description
    this.pendingProgress = `${index + 1} of ${total}`
    this.applyPendingStep()
  }

  public setNavigationEnabled(canGoPrevious: boolean, canGoNext: boolean): void {
    this.requestedPreviousEnabled = canGoPrevious
    this.requestedNextEnabled = canGoNext
    if (this.roomMode && this.roomPopupButton && this.roomTransitionPhase === "idle") {
      this.roomPopupButton.inactive = !canGoNext || this.roomIntroActive || !this.roomItemVisible
    }
    if (!this.roomIntroActive) this.applyNavigationOpacity(canGoPrevious, canGoNext)
  }

  private renderPendingMode(): void {
    if (this.pendingMode === "review") this.buildReviewPane()
    else if (this.pendingMode === "arrival") this.buildArrivalPane()
    else if (this.pendingMode === "spatial") this.buildSpatialPane()
    else this.buildEntryPane()
  }

  private startPane(name: string, gap: number = 1): SceneObject | null {
    if (!this.contentHost) return null
    if (this.activePane) this.activePane.destroy()
    this.inputArea = null
    this.inputStatus = null
    this.arrivalStatus = null
    this.photoImage = null
    this.titleText = null
    this.descriptionText = null
    this.progressText = null
    this.previousButton = null
    this.nextButton = null
    this.spatialPhotoImage = null
    this.spatialPhotoMaterial = null
    this.spatialMarkerObject = null
    this.spatialMarkerMaterial = null
    this.roomGlowObject = null
    this.roomGlowMaterial = null
    this.spatialArrowText = null
    this.spatialInstructionText = null
    this.spatialDetailText = null
    this.spatialProgressText = null
    this.spatialArrowCard = null
    this.spatialInstructionCard = null
    this.spatialDetailCard = null
    this.spatialProgressCard = null
    this.roomWelcomeCard = null
    this.roomPopupButton = null
    this.roomCompletionRoot = null
    this.ghostCompanionObject = null
    this.ghostCompanionMaterial = null
    this.roomWelcomeText = null
    this.spatialTextColors.clear()

    const pane = this.object(this.contentHost, name)
    const column = pane.createComponent(FlexLayout.getTypeName()) as FlexLayout
    column.autoDiscoverItemsOnStart = false
    column.width = this.panelWidth - 2.4
    column.height = Math.max(this.panelHeight, 56) - 2.4
    column.direction = FlexDirection.Column
    column.alignItems = FlexAlign.Stretch
    column.justifyContent = FlexJustify.Start
    column.rowGap = gap
    column.paddingTop = 1
    column.paddingRight = 1
    column.paddingBottom = 1
    column.paddingLeft = 1
    this.activePane = pane
    return pane
  }

  private buildEntryPane(): void {
    const pane = this.startPane("InstructionEntry", 1.2)
    if (!pane) return
    this.addText(pane, "EntryTitle", "Paste your host’s check-in instructions", 7.2, "Title2", HorizontalAlignment.Center)
    this.addText(
      pane,
      "EntrySubtitle",
      "CLAD will turn the message into a clear, ordered arrival guide.",
      4.2,
      "Body",
      HorizontalAlignment.Center
    )
    this.flexChild(pane, {h: 26}, (inputObject) => {
      const inputSurface = inputObject.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
      inputSurface.size = new vec2(this.panelWidth - 6, 26)
      inputSurface.cornerRadius = 1.2
      this.styleCardSurface(inputSurface, 0.14)
      const inputControl = this.object(inputObject, "HostInstructionsInput", new vec3(0, 0, 0.08))
      const input = inputControl.createComponent(TextInputArea.getTypeName()) as TextInputArea
      input.size = new vec3(this.panelWidth - 6, 26, 1)
      input.placeholderText =
        "Enter through the black gate and use code 2345. Walk through the lobby and go upstairs to the third floor. Turn left, find the blue door, and enter code 5236."
      input.paddingLeft = 1
      input.paddingRight = 1
      input.paddingTop = 1
      input.paddingBottom = 1
      input.onInitialized.add(() => this.styleInteractiveVisual(input))
      this.inputArea = input
    }, FlexAlignSelf.Center)
    this.addButton(pane, "CreateGuideButton", "Create My Guide", null, 24, () => {
      this.createGuideEvent.invoke(this.inputArea?.text ?? "")
    })
    this.inputStatus = this.addText(
      pane,
      "InputStatus",
      "Paste from Airbnb, Messages, or email.",
      3.2,
      "Caption",
      HorizontalAlignment.Center
    )
    this.addGuideCompanion(pane, new vec3(-20, 22, 0.3), 4.2)
  }

  private buildReviewPane(): void {
    const pane = this.startPane("GeneratedSteps", 1.2)
    if (!pane) return
    this.addText(pane, "ReviewTitle", "Your Guide is ready", 5.4, "Title2", HorizontalAlignment.Center)
    this.addText(
      pane,
      "ReviewSubtitle",
      `CLAD turned the host’s message into ${this.pendingGeneratedSteps.length} ordered steps`,
      4.2,
      "Body",
      HorizontalAlignment.Center
    )
    const numbered = this.pendingGeneratedSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")
    this.addText(pane, "GeneratedStepList", numbered, 36, "Body", HorizontalAlignment.Left, true)
    this.addText(pane, "ReviewStatus", "Checking whether you’re ready to begin…", 3.2, "Caption", HorizontalAlignment.Center)
    this.addGuideCompanion(pane, new vec3(-20, 22, 0.3), 4.2)
  }

  private buildArrivalPane(): void {
    const pane = this.startPane("ArrivalConfirmation", 1.4)
    if (!pane) return
    this.addGuideCompanion(pane, new vec3(-20, 22, 0.3), 4.5)
    this.addText(pane, "GhostLabel", "SNAP GHOST GUIDE", 3.2, "Caption", HorizontalAlignment.Center)
    this.addText(
      pane,
      "ArrivalQuestion",
      "Have you been dropped off at the location?",
      10,
      "Title2",
      HorizontalAlignment.Center,
      true
    )
    this.flexChild(pane, {h: 7}, (row) => {
      const layout = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
      layout.autoDiscoverItemsOnStart = false
      layout.width = this.panelWidth - 6
      layout.height = 7
      layout.direction = FlexDirection.Row
      layout.alignItems = FlexAlign.Center
      layout.justifyContent = FlexJustify.Center
      layout.columnGap = 1.6
      this.addButton(row, "ArrivedYesButton", "Yes, I’m here", null, 19, () => this.arrivedYesEvent.invoke())
      this.addButton(row, "ArrivedNotYetButton", "Not yet", null, 14, () => this.arrivedNotYetEvent.invoke())
    })
    this.arrivalStatus = this.addText(
      pane,
      "ArrivalStatus",
      "The spatial Guide starts only after you confirm.",
      5,
      "Body",
      HorizontalAlignment.Center,
      true
    )
  }

  private buildNavigationPane(): void {
    const pane = this.startPane("ParisNavigation", 1)
    if (!pane) return
    this.addLocationHeader(pane)
    this.addPhoto(pane)
    this.addTextRow(pane, "GuideTitle", 4.2, "Headline1", (text) => (this.titleText = text))
    this.addTextRow(pane, "GuideDescription", 5.4, "Body", (text) => (this.descriptionText = text))
    this.addProgress(pane)
    this.addNavigation(pane)
    this.applyPendingStep()
  }

  private buildSpatialPane(): void {
    if (!this.contentHost) return
    if (this.activePane) this.activePane.destroy()
    this.inputArea = null
    this.inputStatus = null
    this.arrivalStatus = null
    this.previousButton = null
    this.nextButton = null

    const pane = this.object(this.contentHost, "SpatialGuide")
    this.activePane = pane

    const environment = this.object(pane, "GuideEnvironment", new vec3(0, 0, 0))
    const environmentImage = environment.createComponent("Component.Image") as Image
    const environmentMaterial = imageMaterial.clone()
    environmentMaterial.mainPass.depthTest = true
    environmentMaterial.mainPass.depthWrite = false
    environmentImage.clearMaterials()
    environmentImage.addMaterial(environmentMaterial)
    environment.getTransform().setLocalScale(new vec3(52, 50, 1))
    this.spatialPhotoImage = environmentImage
    this.spatialPhotoMaterial = environmentMaterial

    const roomGlow = this.object(pane, "RoomMarkerGlow", new vec3(0, 0, 0.1))
    const roomGlowImage = roomGlow.createComponent("Component.Image") as Image
    const roomGlowMaterial = imageMaterial.clone()
    roomGlowMaterial.mainPass.baseTex = locationIcon
    roomGlowMaterial.mainPass.baseColor = new vec4(1, 0.72, 0.08, 0)
    roomGlowMaterial.mainPass.depthTest = true
    roomGlowMaterial.mainPass.depthWrite = false
    roomGlowImage.clearMaterials()
    roomGlowImage.addMaterial(roomGlowMaterial)
    roomGlow.getTransform().setLocalScale(new vec3(0, 0, 1))
    this.roomGlowObject = roomGlow
    this.roomGlowMaterial = roomGlowMaterial

    const marker = this.object(pane, "GlowingTarget", new vec3(0, 0, 0.12))
    const markerImage = marker.createComponent("Component.Image") as Image
    const markerMaterial = imageMaterial.clone()
    markerMaterial.mainPass.baseTex = locationIcon
    markerMaterial.mainPass.baseColor = new vec4(1, 0.82, 0.12, 1)
    markerMaterial.mainPass.depthTest = true
    markerMaterial.mainPass.depthWrite = false
    markerImage.clearMaterials()
    markerImage.addMaterial(markerMaterial)
    marker.getTransform().setLocalScale(new vec3(3.2, 3.2, 1))
    this.spatialMarkerObject = marker
    this.spatialMarkerMaterial = markerMaterial

    const arrowLabel = this.addSpatialLabel(
      pane,
      "DirectionArrow",
      "↓",
      4.4,
      4.4,
      "Headline1",
      new vec3(0, 0, 0.16),
      HorizontalAlignment.Center,
      false,
      true
    )
    this.spatialArrowText = arrowLabel.text
    this.spatialArrowCard = arrowLabel.container
    const instructionLabel = this.addSpatialLabel(
      pane,
      "SpatialInstruction",
      "",
      12,
      4,
      "Headline1",
      new vec3(0, 0, 0.2),
      HorizontalAlignment.Center,
      true,
      false
    )
    this.spatialInstructionText = instructionLabel.text
    this.spatialInstructionCard = instructionLabel.container
    const popupTarget = this.object(instructionLabel.container, "RoomPopupTapTarget", new vec3(0, 0, 0.12))
    const popupButton = popupTarget.createComponent(Button.getTypeName()) as Button
    popupButton.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Ghost"})
    popupButton.size = new vec3(12, 4, 1)
    popupButton.opacity = 0.001
    popupButton.inactive = true
    popupButton.onInitialized.add(() => (popupButton.opacity = 0.001))
    popupButton.onTriggerUp.add(() => {
      if (!this.roomMode || !this.roomItemVisible || this.roomTransitionPhase !== "idle") return
      popupButton.inactive = true
      this.nextEvent.invoke()
    })
    this.roomPopupButton = popupButton
    const detailLabel = this.addSpatialLabel(
      pane,
      "SpatialDetail",
      "",
      12,
      4,
      "Body",
      new vec3(0, 0, 0.21),
      HorizontalAlignment.Center,
      true,
      false
    )
    this.spatialDetailText = detailLabel.text
    this.spatialDetailCard = detailLabel.container
    const progressLabel = this.addSpatialLabel(
      pane,
      "SpatialProgress",
      "",
      9,
      2.6,
      "Caption",
      new vec3(18, 24, 0.22),
      HorizontalAlignment.Right,
      false,
      true
    )
    this.spatialProgressText = progressLabel.text
    this.spatialProgressCard = progressLabel.container

    const welcomeLabel = this.addSpatialLabel(
      pane,
      "RoomWelcome",
      "",
      25,
      4,
      "Body",
      new vec3(-5, 19, 0.23),
      HorizontalAlignment.Left,
      true,
      false
    )
    this.roomWelcomeText = welcomeLabel.text
    this.roomWelcomeCard = welcomeLabel.container
    this.setSpatialTextAlpha(this.roomWelcomeText, 0)
    this.setCardOpacity(this.roomWelcomeCard, 0)
    this.roomWelcomeCard.getTransform().setLocalScale(new vec3(0.001, 0.001, 1))

    this.addGuideCompanion(pane, new vec3(-20, 22, 0.3), 4.0)
    this.addRestartControl(pane)

    this.previousButton = this.addFloatingButton(
      pane,
      "PreviousButton",
      backIcon,
      new vec3(-21, -24, 0.24),
      () => this.previousEvent.invoke()
    )
    this.nextButton = this.addFloatingButton(
      pane,
      "NextButton",
      forwardIcon,
      new vec3(21, -24, 0.24),
      () => this.nextEvent.invoke()
    )
    if (this.roomMode) this.setRoomNavigationVisible(false)
    this.applyPendingSpatialStep()
  }

  private updateSpatialAnimation(): void {
    const now = getTime()
    if (this.ghostCompanionObject) {
      const follow = Math.min(1, getDeltaTime() * 3.2)
      this.ghostCurrentPosition = new vec3(
        this.ghostCurrentPosition.x + (this.ghostTargetPosition.x - this.ghostCurrentPosition.x) * follow,
        this.ghostCurrentPosition.y + (this.ghostTargetPosition.y - this.ghostCurrentPosition.y) * follow,
        this.ghostTargetPosition.z
      )
      const bob = Math.sin(now * 2.6) * 0.34
      const drift = Math.sin(now * 1.15) * 0.18
      const welcomePop =
        this.roomGhostRevealStartedAt > 0
          ? this.easeOutBack(Math.max(0, Math.min(1, (now - this.roomGhostRevealStartedAt) / 0.45)))
          : 1
      this.ghostCompanionObject
        .getTransform()
        .setLocalPosition(new vec3(this.ghostCurrentPosition.x + drift, this.ghostCurrentPosition.y + bob, this.ghostCurrentPosition.z))
      const ghostScale = this.ghostBaseScale * welcomePop * (1 + Math.sin(now * 2.1) * 0.025)
      this.ghostCompanionObject.getTransform().setLocalScale(new vec3(ghostScale, ghostScale, 1))
    }

    if (!this.roomMode) {
      if (!this.spatialMarkerObject) return
      const amount = 1 + Math.sin(now * 4) * 0.1
      this.spatialMarkerObject.getTransform().setLocalScale(new vec3(3.2 * amount, 3.2 * amount, 1))
      return
    }

    if (this.roomTransitionPhase === "out") {
      const t = Math.max(0, Math.min(1, (now - this.roomTransitionStartedAt) / 0.22))
      this.setRoomItemAmount(1 - t)
      if (t >= 1) {
        this.applyPendingSpatialStep()
        this.roomTransitionPhase = "in"
        this.roomTransitionStartedAt = now
      }
      return
    }

    if (this.roomTransitionPhase === "in") {
      const t = Math.max(0, Math.min(1, (now - this.roomTransitionStartedAt) / 0.48))
      this.setRoomItemAmount(this.easeOutBack(t))
      if (t >= 1) {
        this.roomTransitionPhase = "idle"
        this.roomItemVisible = true
        this.setRoomItemAmount(1)
        if (this.roomPopupButton) this.roomPopupButton.inactive = !this.requestedNextEnabled
      }
      return
    }

    if (this.roomItemVisible && this.spatialMarkerObject && this.roomGlowObject && this.roomGlowMaterial) {
      const pulse = 1 + Math.sin(now * 3.2) * 0.07
      const glowPulse = 1 + Math.sin(now * 2.4) * 0.12
      this.spatialMarkerObject.getTransform().setLocalScale(new vec3(3.2 * pulse, 3.2 * pulse, 1))
      this.roomGlowObject.getTransform().setLocalScale(new vec3(5.4 * glowPulse, 5.4 * glowPulse, 1))
      this.roomGlowMaterial.mainPass.baseColor = new vec4(1, 0.72, 0.08, 0.24 + Math.sin(now * 2.4) * 0.07)
    }
  }

  private revealRoomGhost(): void {
    if (!this.roomMode || !this.roomIntroActive) return
    this.roomGhostRevealStartedAt = getTime()
    if (this.roomWelcomeText) {
      this.roomWelcomeText.text = "Welcome home — let me show you around."
      this.resizeSpatialLabel(this.roomWelcomeCard, this.roomWelcomeText, this.roomWelcomeText.text, "welcome")
      this.setSpatialTextAlpha(this.roomWelcomeText, 1)
    }
    this.setCardOpacity(this.roomWelcomeCard, 1)
    this.roomWelcomeCard?.getTransform().setLocalScale(new vec3(1, 1, 1))
  }

  private revealFirstRoomItem(): void {
    if (!this.roomMode || !this.roomIntroActive) return
    this.roomIntroActive = false
    if (this.roomWelcomeText) {
      this.roomWelcomeText.text = ""
      this.setSpatialTextAlpha(this.roomWelcomeText, 0)
    }
    this.setCardOpacity(this.roomWelcomeCard, 0)
    this.roomWelcomeCard?.getTransform().setLocalScale(new vec3(0.001, 0.001, 1))
    this.applyPendingSpatialStep()
    this.startRoomItemReveal()
    this.applyNavigationOpacity(this.requestedPreviousEnabled, this.requestedNextEnabled)
  }

  private startRoomItemReveal(): void {
    this.roomItemVisible = false
    this.roomTransitionPhase = "in"
    this.roomTransitionStartedAt = getTime()
    if (this.roomPopupButton) this.roomPopupButton.inactive = true
    this.setRoomItemAmount(0)
  }

  private setRoomItemAmount(rawAmount: number): void {
    const amount = Math.max(0, Math.min(1.12, rawAmount))
    const alpha = Math.max(0, Math.min(1, rawAmount))
    if (this.spatialMarkerObject) {
      this.spatialMarkerObject.getTransform().setLocalScale(new vec3(3.2 * amount, 3.2 * amount, 1))
    }
    if (this.spatialMarkerMaterial) {
      this.spatialMarkerMaterial.mainPass.baseColor = new vec4(1, 0.82, 0.12, alpha)
    }
    if (this.roomGlowObject) {
      this.roomGlowObject.getTransform().setLocalScale(new vec3(5.4 * amount, 5.4 * amount, 1))
    }
    if (this.roomGlowMaterial) {
      this.roomGlowMaterial.mainPass.baseColor = new vec4(1, 0.72, 0.08, 0.28 * alpha)
    }
    this.setAnimatedTextAmount(this.spatialArrowText, amount, alpha)
    this.setAnimatedTextAmount(this.spatialInstructionText, amount, alpha)
    this.setAnimatedTextAmount(this.spatialDetailText, amount, alpha)
    this.setAnimatedTextAmount(this.spatialProgressText, amount, alpha)
    this.setAnimatedCardAmount(this.spatialArrowCard, amount, alpha)
    this.setAnimatedCardAmount(this.spatialInstructionCard, amount, alpha)
    this.setAnimatedCardAmount(this.spatialDetailCard, amount, this.pendingDetail.length > 0 ? alpha : 0)
    this.setAnimatedCardAmount(this.spatialProgressCard, amount, alpha)
  }

  private setAnimatedCardAmount(card: SceneObject | null, amount: number, alpha: number): void {
    if (!card) return
    const scale = Math.max(0.001, amount)
    card.getTransform().setLocalScale(new vec3(scale, scale, 1))
    this.setCardOpacity(card, alpha)
  }

  private setAnimatedTextAmount(text: Text | null, amount: number, alpha: number): void {
    if (!text) return
    const scale = 0.88 + 0.12 * amount
    text.getSceneObject().getTransform().setLocalScale(new vec3(scale, scale, 1))
    this.setSpatialTextAlpha(text, alpha)
  }

  private setSpatialTextAlpha(text: Text, alpha: number): void {
    const base = this.spatialTextColors.get(text) ?? new vec4(1, 1, 1, 1)
    text.textFill.color = new vec4(base.x, base.y, base.z, alpha)
    text.outlineSettings.fill.color = new vec4(0, 0, 0, 0.9 * alpha)
  }

  private setSpatialTextAlphaIfPresent(text: Text | null, alpha: number): void {
    if (text) this.setSpatialTextAlpha(text, alpha)
  }

  private applyNavigationOpacity(canGoPrevious: boolean, canGoNext: boolean): void {
    if (this.previousButton) {
      this.previousButton.inactive = !canGoPrevious
      this.previousButton.opacity = canGoPrevious ? 0.42 : 0.12
      this.setCardOpacity(this.previousButton.getSceneObject().getParent(), canGoPrevious ? 1 : 0.28)
    }
    if (this.nextButton) {
      this.nextButton.inactive = !canGoNext
      this.nextButton.opacity = canGoNext ? 0.42 : 0.12
      this.setCardOpacity(this.nextButton.getSceneObject().getParent(), canGoNext ? 1 : 0.28)
    }
  }

  private setRoomNavigationVisible(visible: boolean): void {
    const scale = visible ? new vec3(1, 1, 1) : new vec3(0.001, 0.001, 1)
    this.previousButton?.getSceneObject().getParent().getTransform().setLocalScale(scale)
    this.nextButton?.getSceneObject().getParent().getTransform().setLocalScale(scale)
    if (!visible) {
      if (this.previousButton) this.previousButton.inactive = true
      if (this.nextButton) this.nextButton.inactive = true
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.45
    const c3 = c1 + 1
    const x = t - 1
    return 1 + c3 * x * x * x + c1 * x * x
  }

  private addSpatialLabel(
    parent: SceneObject,
    name: string,
    value: string,
    width: number,
    height: number,
    role: TextRole,
    position: vec3,
    alignment: HorizontalAlignment,
    wrap: boolean,
    accent: boolean
  ): {container: SceneObject; text: Text} {
    const container = this.object(parent, name, position)
    const surface = container.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    surface.size = new vec2(width, height)
    surface.cornerRadius = Math.min(1.1, height * 0.28)
    this.styleCardSurface(surface, 0.12)

    const textObject = this.object(container, `${name}Text`, new vec3(0, 0, 0.08))
    const text = textObject.createComponent("Component.Text") as Text
    text.text = value
    text.depthTest = true
    text.horizontalAlignment = alignment
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
    text.verticalOverflow = VerticalOverflow.Shrink
    text.layoutRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    applyTextRole(text, role)
    const baseColor = accent ? GOLD : new vec4(1, 1, 1, 1)
    text.textFill.color = baseColor
    this.spatialTextColors.set(text, baseColor)
    text.outlineSettings.enabled = true
    text.outlineSettings.fill.color = new vec4(0, 0, 0, 0.9)
    text.outlineSettings.size = 0.35
    return {container, text}
  }

  private addFloatingButton(
    parent: SceneObject,
    name: string,
    icon: Texture,
    position: vec3,
    callback: () => void
  ): Button {
    const card = this.object(parent, `${name}Card`, position)
    const surface = card.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    surface.size = new vec2(5.4, 5.4)
    surface.cornerRadius = 2.7
    this.styleCardSurface(surface, 0.12)
    const object = this.object(card, name, new vec3(0, 0, 0.08))
    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Round", style: "Ghost"})
    button.size = new vec3(5, 5, 1)
    button.opacity = 0.48
    const content = object.createComponent(ElementContent.getTypeName()) as ElementContent
    content.leadingIcon = icon
    content.leadingIconSize = 2
    content.autoResize = false
    content.sizeOverride = new vec2(5, 5)
    button.onInitialized.add(() => this.styleInteractiveVisual(button))
    button.onTriggerUp.add(callback)
    return button
  }

  private addRestartControl(parent: SceneObject): void {
    const card = this.object(parent, "RestartGuideButtonCard", new vec3(-22, 23.5, 0.26))
    const surface = card.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    surface.size = new vec2(4.2, 4.2)
    surface.cornerRadius = 2.1
    this.styleCardSurface(surface, 0.12)

    const buttonObject = this.object(card, "RestartGuideButton", new vec3(0, 0, 0.08))
    const button = buttonObject.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Round", style: "Ghost"})
    button.size = new vec3(4, 4, 1)
    button.opacity = 0.5
    const content = buttonObject.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = "↻"
    content.textSize = TYPE_SCALE.Headline1.size
    content.autoResize = false
    content.sizeOverride = new vec2(4, 4)
    button.onInitialized.add(() => {
      button.size = new vec3(4, 4, 1)
      this.styleInteractiveVisual(button)
    })
    button.onTriggerUp.add(() => this.restartExperienceEvent.invoke())
  }

  private applyPendingSpatialStep(): void {
    if (this.spatialPhotoImage && this.pendingPhoto) this.spatialPhotoImage.mainPass.baseTex = this.pendingPhoto
    if (this.spatialMarkerObject) {
      this.spatialMarkerObject
        .getTransform()
        .setLocalPosition(new vec3(this.pendingMarkerX, this.pendingMarkerY, 0.12))
    }
    if (this.roomGlowObject) {
      this.roomGlowObject
        .getTransform()
        .setLocalPosition(new vec3(this.pendingMarkerX, this.pendingMarkerY, 0.1))
    }
    if (this.spatialArrowText) {
      this.spatialArrowText.text = this.pendingArrow
      this.resizeSpatialLabel(this.spatialArrowCard, this.spatialArrowText, this.pendingArrow, "arrow")
      this.spatialArrowCard?.getTransform().setLocalPosition(new vec3(this.pendingMarkerX, this.pendingMarkerY + 3.4, 0.16))
    }
    if (this.spatialInstructionText) {
      this.spatialInstructionText.text = this.pendingTitle
      const size = this.resizeSpatialLabel(
        this.spatialInstructionCard,
        this.spatialInstructionText,
        this.pendingTitle,
        "instruction"
      )
      if (this.roomPopupButton) this.roomPopupButton.size = new vec3(size.x, size.y, 1)
      const side = this.pendingMarkerX >= 0 ? -1 : 1
      const x = this.clampBubbleX(this.pendingMarkerX + side * (3.2 + size.x / 2), size.x)
      const y = Math.max(-18 + size.y / 2, Math.min(18 - size.y / 2, this.pendingMarkerY + 4))
      this.spatialInstructionCard?.getTransform().setLocalPosition(new vec3(x, y, 0.2))
    }
    if (this.spatialDetailText) {
      this.spatialDetailText.text = this.pendingDetail
      const size = this.resizeSpatialLabel(this.spatialDetailCard, this.spatialDetailText, this.pendingDetail, "detail")
      const side = this.pendingMarkerX >= 0 ? -1 : 1
      const x = this.clampBubbleX(this.pendingMarkerX + side * (3.2 + size.x / 2), size.x)
      const y = Math.max(-18 + size.y / 2, Math.min(15 - size.y / 2, this.pendingMarkerY - 4))
      this.spatialDetailCard?.getTransform().setLocalPosition(new vec3(x, y, 0.21))
    }
    if (this.spatialProgressText) {
      this.spatialProgressText.text = this.pendingProgress
      this.resizeSpatialLabel(this.spatialProgressCard, this.spatialProgressText, this.pendingProgress, "progress")
    }
    this.setCardOpacity(this.spatialArrowCard, 1)
    this.setCardOpacity(this.spatialInstructionCard, 1)
    if (this.spatialDetailCard) this.spatialDetailCard.enabled = this.pendingDetail.length > 0
    this.setCardOpacity(this.spatialDetailCard, this.pendingDetail.length > 0 ? 1 : 0)
    this.setCardOpacity(this.spatialProgressCard, 1)
    this.setSpatialTextAlphaIfPresent(this.spatialDetailText, this.pendingDetail.length > 0 ? 1 : 0)
    this.spatialDetailCard
      ?.getTransform()
      .setLocalScale(this.pendingDetail.length > 0 ? new vec3(1, 1, 1) : new vec3(0.001, 0.001, 1))
    const side = this.pendingMarkerX >= 0 ? -1 : 1
    const ghostX = Math.max(-20, Math.min(20, this.pendingMarkerX + side * 8))
    const ghostY = Math.max(-17, Math.min(17, this.pendingMarkerY - 7))
    this.ghostTargetPosition = new vec3(ghostX, ghostY, 0.3)
  }

  private resizeSpatialLabel(
    card: SceneObject | null,
    text: Text,
    value: string,
    kind: "arrow" | "instruction" | "detail" | "progress" | "welcome"
  ): vec2 {
    const lines = Math.max(1, value.split("\n").length)
    const longestLine = value.split("\n").reduce((longest, line) => Math.max(longest, line.length), 0)
    let width = 9
    let height = 2.8

    if (kind === "arrow") {
      width = 4.4
      height = 4.4
    } else if (kind === "progress") {
      width = Math.max(7, Math.min(10, 3.8 + longestLine * 0.42))
      height = 2.6
    } else if (kind === "welcome") {
      width = Math.max(15, Math.min(25, 4.5 + longestLine * 0.48))
      height = 4
    } else {
      const charWidth = kind === "instruction" ? 0.48 : 0.4
      const maxWidth = kind === "instruction" ? 22 : 21
      width = Math.max(7, Math.min(maxWidth, 4.2 + longestLine * charWidth))
      const charsPerLine = Math.max(12, Math.floor((width - 2) / charWidth))
      const wrappedLines = value
        .split("\n")
        .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
      const lineHeight = kind === "instruction" ? 1.75 : 1.5
      height = Math.max(3.4, 1.5 + Math.max(lines, wrappedLines) * lineHeight)
    }

    const surface = card?.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (surface) {
      surface.size = new vec2(width, height)
      surface.cornerRadius = Math.min(1, height * 0.28)
    }
    text.layoutRect = Rect.create(-width / 2 + 0.7, width / 2 - 0.7, -height / 2 + 0.45, height / 2 - 0.45)
    return new vec2(width, height)
  }

  private clampBubbleX(x: number, width: number): number {
    const half = width / 2
    return Math.max(-24 + half, Math.min(24 - half, x))
  }

  private addLocationHeader(parent: SceneObject): void {
    this.flexChild(parent, {h: 3.2}, (row) => {
      const content = row.createComponent(ElementContent.getTypeName()) as ElementContent
      content.leadingIcon = locationIcon
      content.leadingIconSize = 2.2
      content.text = "PARIS · PRIVATE ARRIVAL"
      content.textSize = TYPE_SCALE.Caption.size
      content.autoResize = false
      content.sizeOverride = new vec2(this.panelWidth - 6, 3.2)
    })
  }

  private addPhoto(parent: SceneObject): void {
    this.flexChild(parent, {h: this.photoHeight}, (photoObject) => {
      const image = photoObject.createComponent("Component.Image") as Image
      const material = imageMaterial.clone()
      material.mainPass.depthTest = true
      material.mainPass.depthWrite = false
      image.clearMaterials()
      image.addMaterial(material)
      photoObject.getTransform().setLocalScale(new vec3(this.photoWidth, this.photoHeight, 1))
      this.photoImage = image
    }, FlexAlignSelf.Center)
  }

  private addTextRow(parent: SceneObject, name: string, height: number, role: TextRole, capture: (text: Text) => void): void {
    const text = this.addText(parent, name, "", height, role, HorizontalAlignment.Left)
    capture(text)
  }

  private addText(
    parent: SceneObject,
    name: string,
    value: string,
    height: number,
    role: TextRole,
    alignment: HorizontalAlignment,
    wrap: boolean = false
  ): Text {
    let result: Text | null = null
    this.flexChild(parent, {h: height}, (textObject) => {
      textObject.name = name
      const text = textObject.createComponent("Component.Text") as Text
      text.text = value
      text.depthTest = true
      text.horizontalAlignment = alignment
      text.verticalAlignment = VerticalAlignment.Center
      text.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
      text.verticalOverflow = VerticalOverflow.Shrink
      text.layoutRect = Rect.create(-0.5, 0.5, -height / 2, height / 2)
      applyTextRole(text, role)
      result = text
    }, FlexAlignSelf.Stretch)
    return result!
  }

  private addProgress(parent: SceneObject): void {
    this.progressText = this.addText(parent, "GuideProgress", "", 2.6, "Caption", HorizontalAlignment.Center)
  }

  private addNavigation(parent: SceneObject): void {
    this.flexChild(parent, {h: 6.2}, (row) => {
      const layout = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
      layout.autoDiscoverItemsOnStart = false
      layout.width = this.panelWidth - 6
      layout.height = 6.2
      layout.direction = FlexDirection.Row
      layout.alignItems = FlexAlign.Center
      layout.justifyContent = FlexJustify.SpaceBetween
      layout.columnGap = 2
      this.previousButton = this.addButton(row, "PreviousButton", this.previousLabel, backIcon, 17, () => {
        this.previousEvent.invoke()
      })
      this.nextButton = this.addButton(row, "NextButton", this.nextLabel, forwardIcon, 17, () => {
        this.nextEvent.invoke()
      })
    })
  }

  private addButton(
    parent: SceneObject,
    name: string,
    label: string,
    icon: Texture | null,
    width: number,
    callback: () => void
  ): Button {
    const buttonCard = this.object(parent, `${name}Card`)
    const surface = buttonCard.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    surface.size = new vec2(width, 5.4)
    surface.cornerRadius = 2.7
    this.styleCardSurface(surface, 0.14)
    const buttonObject = this.object(buttonCard, name, new vec3(0, 0, 0.08))
    const button = buttonObject.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Ghost"})
    button.size = new vec3(width, 5.4, 1)
    const content = buttonObject.createComponent(ElementContent.getTypeName()) as ElementContent
    if (icon) {
      content.leadingIcon = icon
      content.leadingIconSize = 2.2
    }
    content.text = label
    content.textSize = TYPE_SCALE.Caption.size
    content.autoResize = false
    content.sizeOverride = new vec2(width - 0.6, 5.4)
    button.onInitialized.add(() => this.styleInteractiveVisual(button))
    const item = buttonCard.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = 5.4
    item.flexShrink = 0
    const layout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout) layout.addItems([item])
    button.onTriggerUp.add(callback)
    return button
  }

  private addGuideCompanion(parent: SceneObject, position: vec3, scale: number): void {
    const ghost = this.object(parent, "SnapGhostGuide", position)
    const image = ghost.createComponent("Component.Image") as Image
    const material = imageMaterial.clone()
    material.mainPass.baseTex = guideGhostIcon
    material.mainPass.depthTest = true
    material.mainPass.depthWrite = false
    image.clearMaterials()
    image.addMaterial(material)
    ghost.getTransform().setLocalScale(new vec3(scale, scale, 1))
    this.ghostCompanionObject = ghost
    this.ghostCompanionMaterial = material
    this.ghostTargetPosition = position
    this.ghostCurrentPosition = position
    this.ghostBaseScale = scale
  }

  private styleCardSurface(surface: RoundedRectangle, borderSize: number): void {
    surface.backgroundColor = CARD_BLACK
    surface.gradient = false
    surface.useTexture = false
    surface.border = true
    surface.borderType = "Color"
    surface.borderSize = borderSize
    surface.borderSoftness = 0.04
    surface.borderColor = GOLD_SOFT
  }

  private styleInteractiveVisual(element: Button | TextInputArea): void {
    const visual = element.visual
    visual.baseDefaultColor = CARD_BLACK
    visual.baseHoveredColor = CARD_BLACK_HOVER
    visual.baseTriggeredColor = new vec4(0.22, 0.15, 0.02, 1)
    visual.baseInactiveColor = new vec4(0.02, 0.016, 0.01, 0.55)
  }

  private setCardOpacity(card: SceneObject | null, opacity: number): void {
    if (!card) return
    const surface = card.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (surface) surface.opacity = opacity
  }

  private setBackdropVisible(visible: boolean): void {
    this.backdropObject?.getTransform().setLocalScale(visible ? new vec3(1, 1, 1) : new vec3(0.001, 0.001, 1))
  }

  private applyPendingStep(): void {
    if (this.photoImage && this.pendingPhoto) this.photoImage.mainPass.baseTex = this.pendingPhoto
    if (this.titleText) this.titleText.text = this.pendingTitle
    if (this.descriptionText) this.descriptionText.text = this.pendingDescription
    if (this.progressText) this.progressText.text = this.pendingProgress
  }

  private object(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) sceneObject.getTransform().setLocalPosition(position)
    return sceneObject
  }

  private flexChild(
    parent: SceneObject,
    size: {w?: number; h?: number; grow?: number},
    builder: (childObject: SceneObject) => void,
    alignSelf: FlexAlignSelf = FlexAlignSelf.Stretch
  ): SceneObject {
    const child = this.object(parent, "GuideItem", new vec3(0, 0, 0.02))
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
    if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
    item.flexGrow = size.grow ?? 0
    item.flexShrink = 0
    item.alignSelf = alignSelf
    builder(child)
    const layout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout) layout.addItems([item])
    return child
  }
}
