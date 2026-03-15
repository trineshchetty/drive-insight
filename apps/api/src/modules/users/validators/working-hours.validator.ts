import { WorkingHoursSchema } from '@drive-insight/types';
import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export function IsWorkingHours(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isWorkingHours',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined) {
            return true;
          }

          return WorkingHoursSchema.safeParse(value).success;
        },
        defaultMessage(args?: ValidationArguments) {
          return `${args?.property ?? 'working_hours'} must match the shared working hours schema`;
        },
      },
    });
  };
}
