import { ErrorCode } from './types';
import { MergedActionLog } from '@dispatch-services/db-forum-common/actions/types';
import { register } from '@dispatch-services/utils-common/singleton';

export * from './types';

const keyPrefix = `@dispatch-services/db-forum-common/errors/index#`;

const { errorTraces } = register(() => {
  const errorTraces: { [actionId: string]: ErrorCode[] } = {};
  return { errorTraces };
}, `${keyPrefix}globals`);

type ValidateFn = () => boolean;

function trackError(log: MergedActionLog, validateFn: ValidateFn, code: ErrorCode): ReturnType<typeof validateFn> {
  const result = validateFn();
  if (!result) {
    if (!errorTraces[log.actionId]) {
      errorTraces[log.actionId] = [];
    }
    errorTraces[log.actionId].push(code);
  }
  return result;
}

export function validateLog(log: MergedActionLog, code: ErrorCode) {
  return {
    test: function (validateFn: ValidateFn) {
      return trackError(log, validateFn, code);
    },
  };
}

export function popLogErrors(log: MergedActionLog) {
  const errors = errorTraces[log.actionId];
  delete errorTraces[log.actionId];
  return errors;
}
