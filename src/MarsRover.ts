import { all } from './handler/All';
import { handleCommand, nothing } from './handler/Command';
import { completeMovement } from './handler/Movement';
import { checkObstacle, handleOverflow } from './handler/Planet';
import { sameIdentifier } from './handler/SameIdentifier';
import { Command } from './model/Command';
import { Direction, EAST, NORTH, SOUTH, WEST } from './model/Direction';
import { Planet } from './model/Planet';
import { RobotState, RobotStateHandler, RobotStateIdentifier } from './state/RobotState';
import { State, StateHandler } from './state/State';

const stringToDirection: Map<string, Direction> = new Map<string, Direction>([
  ['N', NORTH],
  ['E', EAST],
  ['W', WEST],
  ['S', SOUTH],
]);

const directionToString: Map<Direction, string> = new Map<Direction, string>([
  [NORTH, 'N'],
  [EAST, 'E'],
  [WEST, 'W'],
  [SOUTH, 'S'],
]);

const stringToCommand: Map<string, Command> = new Map<string, Command>([
  ['L', Command.LEFT],
  ['R', Command.RIGHT],
  ['F', Command.FORWARD],
  ['B', Command.BACKWARD],
]);

const printPosition = (state: RobotState) => {
  const directionString = directionToString.get(state.props.direction) || '-';
  const positionString = `${state.props.coordinates.x}:${state.props.coordinates.y}`;
  return `${positionString}:${directionString}`;
};

export class StateMachine<S extends State<any, any>> {
  constructor(private handlers: Map<S['identifier'], StateHandler<S>>) {}

  next(state: RobotState): RobotState {
    const nextState = (this.handlers.get(state.identifier) || nothing)(state);
    return nextState.identifier === state.identifier ? nextState : this.next(nextState);
  }
}

export class MarsRover {
  private state: RobotState;
  private machine: StateMachine<RobotState>;

  constructor(x: number, y: number, direction: string, private planet: Planet) {
    const position = { x, y };
    this.state = new State(RobotStateIdentifier.IDLE, {
      coordinates: position,
      direction: stringToDirection.get(direction) || NORTH,
      command: Command.NONE,
    });

    const toFront = (state: RobotState) => state.props.direction.front(state.props.coordinates);
    const toBack = (state: RobotState) => state.props.direction.back(state.props.coordinates);

    this.machine = new StateMachine<RobotState>(
      new Map<RobotStateIdentifier, RobotStateHandler>([
        [RobotStateIdentifier.IDLE, all([handleOverflow(planet), handleCommand])],
        [RobotStateIdentifier.BLOCKED, nothing],
        [
          RobotStateIdentifier.MOVING_FRONT,
          sameIdentifier([checkObstacle(planet, toFront), completeMovement(toFront)]),
        ],
        [RobotStateIdentifier.MOVING_BACK, sameIdentifier([checkObstacle(planet, toBack), completeMovement(toBack)])],
      ]),
    );
  }

  move(commands: string) {
    [...commands].forEach((command: string) => {
      const nextCommand = stringToCommand.get(command) || Command.NONE;
      this.state = this.machine.next(this.state.update({ command: nextCommand }));
    });

    return printPosition(this.state);
  }
}
