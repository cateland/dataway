import { left, right } from 'fp-ts/lib/Either';

import {
  Dataway,
  dataway,
  notAsked,
  loading,
  failure,
  success,
  map2,
  map3,
  append,
  fromEither,
} from '../src/main';

describe('Dataway', () => {
  describe('Functor', () => {
    it('map', () => {
      const f = (s: string): number => s.length;
      expect(notAsked<string, string>().map(f)).toEqual(notAsked());
      expect(loading<string, string>().map(f)).toEqual(loading());
      expect(failure<string, string>('xyz').map(f)).toEqual(failure('xyz'));
      expect(success('abc').map(f)).toEqual(success(3));

      expect(dataway.map(notAsked<string, string>(), f)).toEqual(notAsked());
      expect(dataway.map(loading<string, string>(), f)).toEqual(loading());
      expect(dataway.map(failure<string, string>('xyz'), f)).toEqual(
        failure('xyz'),
      );
      expect(dataway.map(success('abc'), f)).toEqual(success(3));
    });
  });

  describe('Apply', () => {
    const f = (s: string): number => s.length;
    it('return failure if any of the Dataway fail', () => {
      expect(
        notAsked<string, string>().ap(
          failure<string, (s: string) => number>('xyz'),
        ),
      ).toEqual(failure('xyz'));
      expect(
        loading<string, string>().ap(
          failure<string, (s: string) => number>('xyz'),
        ),
      ).toEqual(failure('xyz'));
      expect(success('abc').ap(failure('xyz'))).toEqual(failure('xyz'));
      expect(
        failure<string, string>('xyz').ap(
          notAsked<string, (s: string) => number>(),
        ),
      ).toEqual(failure('xyz'));
      expect(
        failure<string, string>('xyz').ap(
          loading<string, (s: string) => number>(),
        ),
      ).toEqual(failure('xyz'));
      expect(
        failure<string, string>('xyz').ap(
          success<string, (s: string) => number>(f),
        ),
      ).toEqual(failure('xyz'));
    });

    it('return left failure if two Dataway are failed', () => {
      expect(
        failure<string, string>('xyz').ap(
          failure<string, (s: string) => number>('stu'),
        ),
      ).toEqual(failure('stu'));
    });

    it('return Loading if both Dataway are loading or one is a success', () => {
      expect(
        loading<string, string>().ap(loading<string, (s: string) => number>()),
      ).toEqual(loading());
      expect(
        loading<string, string>().ap(success<string, (s: string) => number>(f)),
      ).toEqual(loading());
      expect(success('abc').ap(loading())).toEqual(loading());
    });

    it('return NotAsked if one of the Dataway is NotAsked and the other is not Failed', () => {
      expect(
        notAsked<string, string>().ap(
          notAsked<string, (s: string) => number>(),
        ),
      ).toEqual(notAsked());
      expect(
        notAsked<string, string>().ap(loading<string, (s: string) => number>()),
      ).toEqual(notAsked());
      expect(
        notAsked<string, string>().ap(
          success<string, (s: string) => number>(f),
        ),
      ).toEqual(notAsked());
      expect(
        loading<string, string>().ap(notAsked<string, (s: string) => number>()),
      ).toEqual(notAsked());
      expect(success('abc').ap(notAsked())).toEqual(notAsked());
      expect(notAsked<string, string>().ap(success(f))).toEqual(notAsked());
    });

    it('return a Dataway with an object of values from two succesfull Dataway', () => {
      expect(success('abc').ap(success(f))).toEqual(success(3));
    });

    describe('map2', () => {
      const f = (s1: string) => (s2: string) => `${s1}${s2}`;
      it('return success if both Dataway are success', () => {
        expect(map2(f, success('abc'), success('def'))).toEqual(
          success('abcdef'),
        );
      });
      it('return failure if one Dataway is a failure', () => {
        expect(map2(f, success('abc'), failure('xyz'))).toEqual(failure('xyz'));
      });
    });

    describe('map3', () => {
      const f = (s1: string) => (s2: string) => (s3: string) =>
        `${s1}${s2}${s3}`;
      it('return success if all Dataway are success', () => {
        expect(map3(f, success('abc'), success('def'), success('ghi'))).toEqual(
          success('abcdefghi'),
        );
      });
      it('return failure if one Dataway is a failure', () => {
        expect(map3(f, success('abc'), failure('xyz'), success('ghi'))).toEqual(
          failure('xyz'),
        );
      });
    });

    describe('append', () => {
      it('return success if both Dataway are success', () => {
        expect(append(success('abc'), success('def'))).toEqual(
          success(['abc', 'def']),
        );
      });
      it('return failure if one Dataway is a failure', () => {
        expect(append(success('abc'), failure('xyz'))).toEqual(failure('xyz'));
      });
    });
  });

  describe('Applicative', () => {
    it('follow Identity law', () => {
      expect(
        dataway.ap(
          dataway.of<string, (a: string) => string>(a => a),
          success('abc'),
        ),
      ).toEqual(success('abc'));
    });
    it('follow Homomorphism law', () => {
      expect(dataway.ap(dataway.of(success), dataway.of('abc'))).toEqual(
        dataway.of(success('abc')),
      );
    });
    it('follow Interchange law', () => {
      const f = (s: string): number => s.length;
      expect(dataway.ap(success(f), dataway.of('abc'))).toEqual(
        dataway.ap(
          dataway.of<string, (a: (b: string) => number) => number>(ab =>
            ab('abc'),
          ),
          success(f),
        ),
      );
    });
  });

  describe('Chain', () => {
    it('follow Identity law', () => {
      const f = <A, B>(s: A): Dataway<string, B> => failure('error');
      expect(dataway.chain(dataway.of('abc'), f)).toEqual(f('abc'));
      expect(dataway.chain(success('abc'), dataway.of)).toEqual(success('abc'));
    });
  });

  it('fold', () => {
    const notaskedvalue = 'notAsked';
    const loadingvalue = 'loading';
    const onError = (error: string): string => error;
    const onSuccess = (value: string): string => value.length.toString();
    expect(
      notAsked<string, string>().fold(
        notaskedvalue,
        loadingvalue,
        onError,
        onSuccess,
      ),
    ).toEqual(notaskedvalue);
    expect(
      loading<string, string>().fold(
        notaskedvalue,
        loadingvalue,
        onError,
        onSuccess,
      ),
    ).toEqual(loadingvalue);
    expect(
      failure<string, string>('error loading resource').fold(
        notaskedvalue,
        loadingvalue,
        onError,
        onSuccess,
      ),
    ).toEqual('error loading resource');
    expect(
      success<string, string>('axel').fold(
        notaskedvalue,
        loadingvalue,
        onError,
        onSuccess,
      ),
    ).toEqual('4');
  });

  describe('fromEither', () => {
    it('create failure from Left', () => {
      const myError = 'my error';
      const eitherLeft = left<string, string>(myError);

      const data = fromEither(eitherLeft);
      const content = data.fold(
        'not asked',
        'loading',
        error => error,
        value => value,
      );

      expect(data.isFailure()).toEqual(true);
      expect(content).toEqual(myError);
    });

    it('create success from Right', () => {
      const myValue = 'my value';
      const eitherRight = right<string, string>(myValue);

      const data = fromEither(eitherRight);
      const content = data.fold(
        'not asked',
        'loading',
        error => error,
        value => value,
      );

      expect(data.isSuccess()).toEqual(true);
      expect(content).toEqual(myValue);
    });
  });
});
