import { handleCommand, resetCommand } from './handler/Command';
import { completeMovement } from './handler/Movement';
import { notifyPosition } from './handler/Notify';
import { checkObstacle, handleOverflow } from './handler/Planet';
import { Command } from './model/Command';
import { Direction, EAST, NORTH, SOUTH, WEST } from './model/Direction';
import { Planet } from './model/Planet';
import { RobotState, RobotStateId } from './RobotState';
import { all, to } from './state/Handlers';
import { State } from './state/State';
import { StateMachine, StateMachineBuilder } from './state/StateMachine';

const stringToDirection: Map<string, Direction> = new Map<string, Direction>([
  ['N', NORTH],
  ['E', EAST],
  ['W', WEST],
  ['S', SOUTH],
]);

const stringToCommand: Map<string, Command> = new Map<string, Command>([
  ['L', Command.LEFT],
  ['R', Command.RIGHT],
  ['F', Command.FORWARD],
  ['B', Command.BACKWARD],
]);

export class MarsRover {
  private state: RobotState;
  private machine: StateMachine<RobotState>;
  private position = '';

  constructor(x: number, y: number, direction: string, private planet: Planet) {
    this.state = new State(RobotStateId.IDLE, {
      coordinates: { x, y },
      direction: stringToDirection.get(direction) || NORTH,
      command: Command.NONE,
    });

    const toFront = (state: RobotState) => state.props.direction.front(state.props.coordinates);
    const toBack = (state: RobotState) => state.props.direction.back(state.props.coordinates);
    const positionListener = (updatedPosition: string) => (this.position = updatedPosition);

    this.machine = new StateMachineBuilder<RobotState>()
      .with(RobotStateId.IDLE, handleCommand, /* TODO: create a proper method to pass onLeave handlers */ resetCommand)
      .with(RobotStateId.BLOCKED, notifyPosition(positionListener))
      .with(RobotStateId.MOVING_FRONT, all([checkObstacle(planet, toFront), completeMovement(toFront)]))
      .with(RobotStateId.MOVING_BACK, all([checkObstacle(planet, toBack), completeMovement(toBack)]))
      .with(RobotStateId.MOVED, all([handleOverflow(planet), notifyPosition(positionListener), to(RobotStateId.IDLE)]))
      .build();
  }

  move(commands: string) {
    [...commands].forEach((command: string) => {
      const nextCommand = stringToCommand.get(command) || Command.NONE;
      this.state = this.machine.next(this.state.update({ command: nextCommand }));
    });

    return this.position;
  }
}
