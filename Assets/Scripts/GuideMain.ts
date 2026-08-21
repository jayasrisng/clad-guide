import {GuideUI} from "./GuideUI"

type GuideStep = {
  photo: Texture
  title: string
  description: string
  instruction: string
  markerX: number
  markerY: number
  arrow: string
  detail?: string
}

const parisSteps: GuideStep[] = [
  {
    photo: requireAsset("../Guide/Images/1.png") as Texture,
    title: "Arrive at the Haussmann Corner",
    description: "Begin at the cream-stone corner building. Keep the long balcony facade on your right.",
    instruction: "Follow the corner entrance",
    markerX: 12,
    markerY: -4,
    arrow: "↘",
  },
  {
    photo: requireAsset("../Guide/Images/2.png") as Texture,
    title: "Find the Wrought-Iron Gate",
    description: "Approach the arched black gate marked 12.",
    instruction: "Enter 2345",
    markerX: 15,
    markerY: 1,
    arrow: "→",
  },
  {
    photo: requireAsset("../Guide/Images/3.png") as Texture,
    title: "Cross the Marble Lobby",
    description: "Pass through the gate and continue straight along the marble gallery.",
    instruction: "Walk straight through",
    markerX: 0,
    markerY: 2,
    arrow: "↑",
  },
  {
    photo: requireAsset("../Guide/Images/4.png") as Texture,
    title: "Follow the Curved Stair",
    description: "At the end of the gallery, take the sweeping staircase upward.",
    instruction: "Go upstairs",
    markerX: -2,
    markerY: 2,
    arrow: "↑",
  },
  {
    photo: requireAsset("../Guide/Images/5.png") as Texture,
    title: "Continue Down the Private Hall",
    description: "Leave the landing and follow the bright paneled corridor.",
    instruction: "Turn left",
    markerX: -12,
    markerY: 0,
    arrow: "←",
  },
  {
    photo: requireAsset("../Guide/Images/6.png") as Texture,
    title: "Stop at the Navy Door",
    description: "Your destination is the navy door beside the keypad.",
    instruction: "Enter 5236",
    markerX: 13,
    markerY: -2,
    arrow: "→",
  },
]

const roomPhoto = requireAsset("../Guide/Images/room_building_9_source_1536x1024.png") as Texture

type RoomStep = {
  instruction: string
  markerX: number
  markerY: number
  arrow: string
  detail?: string
}

const roomSteps: RoomStep[] = [
  {
    instruction: "Wi-Fi details",
    markerX: -4,
    markerY: 7,
    arrow: "•",
    detail: "Wi-Fi: ParisGuest\nPassword: bonjour123",
  },
  {instruction: "Light switch", markerX: -17, markerY: 0, arrow: "←"},
  {instruction: "Spare blanket", markerX: 20, markerY: 6, arrow: "→", detail: "In the closet"},
  {instruction: "Thermostat", markerX: 15, markerY: 5, arrow: "→"},
  {instruction: "Fresh towels", markerX: 20, markerY: -8, arrow: "↘", detail: "In the closet basket"},
  {instruction: "Kitchen essentials", markerX: 7, markerY: -1, arrow: "→", detail: "Feel free to use them"},
  {
    instruction: "Checkout is at 11 AM.",
    markerX: -13,
    markerY: -2,
    arrow: "←",
    detail: "Leave the keys inside and close the door behind you.",
  },
]

@component
export class GuideMain extends BaseScriptComponent {
  @ui.label('<span style="color:#60A5FA;">Guide Controller</span>')
  @ui.separator
  @input
  @hint("Step shown when the spatial Paris guide begins (1 through 6).")
  @widget(new SliderWidget(1, 6, 1))
  initialStep: number = 1

  private index: number = 0
  private initialized: boolean = false
  private ui: GuideUI | null = null
  private arrivalTimer: DelayedCallbackEvent | null = null
  private navigationUnlockTimer: DelayedCallbackEvent | null = null
  private navigationLocked: boolean = false
  private guideMode: "route" | "room" = "route"
  private roomIndex: number = 0

  onAwake(): void {
    const deferredStart = this.createEvent("DelayedCallbackEvent")
    deferredStart.bind(() => this.onStart())
    deferredStart.reset(0.2)
  }

  private onStart(): void {
    if (this.initialized) return
    this.ui = this.sceneObject.getComponent(GuideUI.getTypeName()) as GuideUI | null
    if (!this.ui) {
      console.error("[GuideMain] GuideUI component was not found on this SceneObject")
      return
    }

    this.initialized = true
    this.index = Math.max(0, Math.min(parisSteps.length - 1, Math.round(this.initialStep) - 1))
    this.ui.onCreateGuide.add((instructions: string) => this.createGuide(instructions))
    this.ui.onArrivedYes.add(() => this.beginSpatialGuide())
    this.ui.onArrivedNotYet.add(() => this.ui?.showWaitingMessage())
    this.ui.onPrevious.add(() => this.goPrevious())
    this.ui.onNext.add(() => this.goNext())
    this.ui.onReplayRoomGuide.add(() => this.replayRoomGuide())
    this.ui.onRestartExperience.add(() => this.restartExperience())
    this.ui.showInstructionEntry()
    console.log(`[GuideMain] Ready for host instructions; ${parisSteps.length} Paris navigation steps preserved`)
  }

  private createGuide(instructions: string): void {
    const generated = this.parseInstructions(instructions)
    if (generated.length === 0) {
      this.ui?.showInputError("Paste the host’s instructions before creating your guide.")
      return
    }

    this.ui?.showGeneratedSteps(generated)
    console.log(`[GuideMain] CLAD generated ${generated.length} ordered steps`)
    if (!this.arrivalTimer) {
      this.arrivalTimer = this.createEvent("DelayedCallbackEvent")
      this.arrivalTimer.bind(() => this.ui?.showArrivalPrompt())
    }
    this.arrivalTimer.enabled = true
    this.arrivalTimer.reset(5.0)
  }

  private parseInstructions(raw: string): string[] {
    const normalized = raw.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim()
    if (normalized.length === 0) return []

    const action = "(?:approach|arrive|begin|confirm|continue|cross|enter|find|follow|go|head|leave|look|open|pass|proceed|stop|take|turn|use|walk)"
    const separator = new RegExp(
      `(?:[.!?;]+|\\n+|\\b(?:and\\s+then|then)\\b|,\\s*(?=${action}\\b)|\\s+and\\s+(?=${action}\\b))`,
      "gi"
    )

    return normalized
      .split(separator)
      .map((step) => step.trim().replace(/^[,\-–—:\s]+|[,\-–—:\s]+$/g, ""))
      .filter((step) => step.length > 0)
      .slice(0, 10)
      .map((step) => step.charAt(0).toUpperCase() + step.slice(1))
  }

  private beginSpatialGuide(): void {
    this.guideMode = "route"
    this.roomIndex = 0
    this.ui?.showNavigation()
    this.render()
    console.log("[GuideMain] Arrival confirmed; spatial Paris guide started")
  }

  private goPrevious(): void {
    if (this.navigationLocked) return
    if (this.guideMode === "room") {
      if (this.roomIndex === 0) {
        this.lockNavigation(1.2)
        this.guideMode = "route"
        this.index = parisSteps.length - 1
        this.render()
      } else {
        this.showRoomStep(this.roomIndex - 1)
      }
      return
    }
    this.showStep(this.index - 1)
  }

  private goNext(): void {
    if (this.navigationLocked) return
    if (this.guideMode === "room") {
      if (this.roomIndex === roomSteps.length - 1) {
        this.ui?.showRoomCompletion()
        console.log("[GuideMain] Room Guide complete")
        return
      }
      this.showRoomStep(this.roomIndex + 1)
      return
    }
    if (this.index === parisSteps.length - 1) {
      this.guideMode = "room"
      this.roomIndex = 0
      const firstRoomStep = roomSteps[0]
      this.ui?.beginRoomGuide(roomPhoto)
      this.ui?.setRoomStep(
        roomPhoto,
        firstRoomStep.instruction,
        firstRoomStep.markerX,
        firstRoomStep.markerY,
        firstRoomStep.arrow,
        `ROOM 1 / ${roomSteps.length}`,
        firstRoomStep.detail ?? ""
      )
      this.ui?.setNavigationEnabled(true, true)
      this.lockNavigation(2.4)
      console.log("[GuideMain] Route complete; Room Guide started")
      return
    }
    this.showStep(this.index + 1)
  }

  private showStep(nextIndex: number): void {
    if (this.navigationLocked) return
    const clamped = Math.max(0, Math.min(parisSteps.length - 1, nextIndex))
    if (clamped === this.index) return
    this.lockNavigation(1.2)
    this.index = clamped
    this.render()
  }

  private render(): void {
    if (!this.ui) return
    const step = parisSteps[this.index]
    this.ui.setSpatialStep(
      step.photo,
      step.instruction,
      step.markerX,
      step.markerY,
      step.arrow,
      `${this.index + 1} / ${parisSteps.length}`,
      step.detail ?? ""
    )
    this.ui.setNavigationEnabled(this.index > 0, true)
  }

  private showRoomStep(nextIndex: number): void {
    if (this.navigationLocked) return
    const clamped = Math.max(0, Math.min(roomSteps.length - 1, nextIndex))
    if (clamped === this.roomIndex) return
    this.lockNavigation(1.2)
    this.roomIndex = clamped
    const step = roomSteps[this.roomIndex]
    this.ui?.setRoomStep(
      roomPhoto,
      step.instruction,
      step.markerX,
      step.markerY,
      step.arrow,
      `ROOM ${this.roomIndex + 1} / ${roomSteps.length}`,
      step.detail ?? ""
    )
    this.ui?.setNavigationEnabled(true, true)
  }

  private replayRoomGuide(): void {
    this.clearNavigationLock()
    this.guideMode = "room"
    this.roomIndex = 0
    const firstRoomStep = roomSteps[0]
    this.ui?.beginRoomGuide(roomPhoto)
    this.ui?.setRoomStep(
      roomPhoto,
      firstRoomStep.instruction,
      firstRoomStep.markerX,
      firstRoomStep.markerY,
      firstRoomStep.arrow,
      `ROOM 1 / ${roomSteps.length}`,
      firstRoomStep.detail ?? ""
    )
    this.ui?.setNavigationEnabled(true, true)
    this.lockNavigation(2.4)
    console.log("[GuideMain] Room Guide replayed from Wi-Fi")
  }

  private restartExperience(): void {
    if (this.arrivalTimer) this.arrivalTimer.enabled = false
    this.clearNavigationLock()
    this.index = Math.max(0, Math.min(parisSteps.length - 1, Math.round(this.initialStep) - 1))
    this.guideMode = "route"
    this.roomIndex = 0
    this.ui?.resetExperience()
    console.log("[GuideMain] Experience reset to fresh instruction entry")
  }

  private clearNavigationLock(): void {
    this.navigationLocked = false
    if (this.navigationUnlockTimer) this.navigationUnlockTimer.enabled = false
  }

  private lockNavigation(seconds: number): void {
    this.navigationLocked = true
    if (!this.navigationUnlockTimer) {
      this.navigationUnlockTimer = this.createEvent("DelayedCallbackEvent")
      this.navigationUnlockTimer.bind(() => (this.navigationLocked = false))
    }
    this.navigationUnlockTimer.enabled = true
    this.navigationUnlockTimer.reset(seconds)
  }
}
