import { Card, CardContent, CardHeader, Skeleton } from '@monprojetpro/ui'

export default function LoginLoading() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Skeleton className="mx-auto h-8 w-20" />
        <Skeleton className="mx-auto h-4 w-44" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
