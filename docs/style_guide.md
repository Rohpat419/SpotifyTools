# Coding Style Guide

## General Principles
- Write modular, extensible code
- New features should slot in without large rewrites
- Keep functions focused and single-purpose

## Python (Backend)

### Version
Python 3.10+

### Style
- Follow PEP 8
- Use type hints for function signatures
- Docstrings for non-obvious functions

### Django/DRF Patterns
```python
@api_view(["POST"])
def endpoint_name(request):
    try:
        # Validate input
        param = request.data.get("param")
        if not param:
            return Response({"detail": "param required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Business logic
        result = do_something(param)
        
        return Response(result)
    except Exception as e:
        print(f"[endpoint_name] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### Error Handling
- Log errors with `print(f"[function_name] Error: {e}")`
- Return user-friendly error messages
- Handle Spotify 429s with retry logic (Retry-After header)

## TypeScript/React (Frontend)

### Style
- Functional components with hooks
- TypeScript strict mode
- TailwindCSS for styling
- shadcn/ui components where applicable

### Component Pattern
```tsx
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export function ComponentName({ title, onSubmit }: Props) {
  const [state, setState] = useState<string>("");
  
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### API Calls
- Use `lib/api.ts` for all backend communication
- Handle loading and error states
- Environment variable: `NEXT_PUBLIC_API_BASE`

## Accessibility (WCAG 2.1 AA)
- Semantic HTML elements
- ARIA attributes where needed
- Keyboard navigation support
- Sufficient color contrast
- Form inputs must have labels

## Testing

### Backend
- Framework: `pytest` or Django test framework
- Mock Spotify API responses
- Test token refresh flow
- Test error handling

### Frontend
- Framework: Jest + React Testing Library
- Test component rendering
- Test user interactions
- Include accessibility tests

## Git Conventions
- Commits: Present tense, imperative (`Add feature`, not `Added feature`)
- Branch names: `feature/`, `fix/`, `refactor/`
- No secrets in commits

## API Design
- RESTful conventions
- Consistent response structure: `{ "data": ... }` or `{ "detail": "error" }`
- HTTP status codes: 200 (success), 400 (bad request), 500 (server error)
