import { describe, expect, it } from 'vitest'
import { translateRoutePath, UntranslatableRouteError } from './translate-path.ts'

describe('translateRoutePath', () => {
  describe('static and root', () => {
    it('passes through root', () => {
      expect(translateRoutePath('/').paths).toEqual(['/'])
    })

    it('passes through static paths', () => {
      expect(translateRoutePath('/about').paths).toEqual(['/about'])
      expect(translateRoutePath('/posts/list').paths).toEqual(['/posts/list'])
    })

    it('strips trailing slashes', () => {
      expect(translateRoutePath('/about/').paths).toEqual(['/about'])
    })
  })

  describe('named params', () => {
    it('translates $name to :name', () => {
      expect(translateRoutePath('/posts/$id').paths).toEqual(['/posts/:id'])
    })

    it('translates braced {$name} to :name', () => {
      expect(translateRoutePath('/posts/{$id}').paths).toEqual(['/posts/:id'])
    })

    it('translates multiple params', () => {
      expect(translateRoutePath('/posts/$postId/comments/$commentId').paths).toEqual([
        '/posts/:postId/comments/:commentId',
      ])
    })

    it('translates prefix{$name} with literal prefix', () => {
      expect(translateRoutePath('/files/prefix{$name}').paths).toEqual(['/files/prefix:name'])
    })
  })

  describe('splat / wildcard', () => {
    it('translates terminal $ to *', () => {
      expect(translateRoutePath('/files/$').paths).toEqual(['/files/*'])
    })

    it('translates terminal {$} to *', () => {
      expect(translateRoutePath('/files/{$}').paths).toEqual(['/files/*'])
    })

    it('translates multi-segment splat', () => {
      expect(translateRoutePath('/api/auth/$').paths).toEqual(['/api/auth/*'])
    })

    it('translates prefix{$} terminal to prefix*', () => {
      expect(translateRoutePath('/files/prefix{$}').paths).toEqual(['/files/prefix*'])
    })
  })

  describe('optional params', () => {
    it('translates terminal {-$name} to :name?', () => {
      expect(translateRoutePath('/posts/{-$slug}').paths).toEqual(['/posts/:slug?'])
    })

    it('dual-registers mid-path optional', () => {
      const { paths } = translateRoutePath('/posts/{-$slug}/edit')
      expect(paths.sort()).toEqual(['/posts/:slug/edit', '/posts/edit'].sort())
    })

    it('dual-registers two mid-path optionals', () => {
      const { paths } = translateRoutePath('/{-$a}/{-$b}/end')
      expect(paths.sort()).toEqual(['/:a/:b/end', '/:a/end', '/:b/end', '/end'].sort())
    })
  })

  describe('untranslatable: throws', () => {
    it('throws on mid-path bare $', () => {
      expect(() => translateRoutePath('/files/$/bar')).toThrow(UntranslatableRouteError)
    })

    it('throws on mid-path {$}', () => {
      expect(() => translateRoutePath('/files/{$}/bar')).toThrow(
        /wildcard must be the last segment/,
      )
    })

    it('throws on wildcard with suffix', () => {
      expect(() => translateRoutePath('/files/{$}suffix')).toThrow(/wildcard cannot have a suffix/)
    })

    it('throws on param with suffix', () => {
      expect(() => translateRoutePath('/posts/{$id}.html')).toThrow(/suffix/)
    })

    it('throws on optional with prefix or suffix', () => {
      expect(() => translateRoutePath('/posts/prefix{-$slug}')).toThrow(/prefix or suffix/)
      expect(() => translateRoutePath('/posts/{-$slug}suffix')).toThrow(/prefix or suffix/)
    })

    it('throws on non-identifier param name', () => {
      expect(() => translateRoutePath('/posts/$weird-name')).toThrow(/param name/)
    })
  })

  describe('error messages', () => {
    it('names the original path and segment', () => {
      try {
        translateRoutePath('/_auth/posts/{-$slug}suffix')
      } catch (e) {
        expect(e).toBeInstanceOf(UntranslatableRouteError)
        expect((e as Error).message).toContain('/_auth/posts/{-$slug}suffix')
        expect((e as Error).message).toContain('{-$slug}suffix')
      }
    })
  })
})
